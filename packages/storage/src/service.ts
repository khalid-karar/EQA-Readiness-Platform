import { randomUUID } from "node:crypto";
import { sha256Hex } from "@eqa/crypto";
import type { JobQueue } from "@eqa/jobs";
import type { TenantContext } from "@eqa/tenant";
import {
  EvidenceNotFoundError,
  EvidenceNotReadyError,
  FileTooLargeError,
  StorageError,
  UnsupportedFileTypeError,
} from "./errors";
import { MALWARE_SCAN_JOB, type MalwareScanPayload } from "./scan-job";
import type {
  EvidenceMetadata,
  EvidenceStore,
  FileCipher,
  ObjectStore,
  SignedUrl,
  SignedUrlSigner,
  UploadInput,
  UploadResult,
} from "./types";

export interface EvidenceServiceConfig {
  /** Maximum upload size in bytes. */
  readonly maxBytes: number;
  /** Allowlist of acceptable content types. */
  readonly allowedContentTypes: readonly string[];
  /** Lifetime of a signed download URL, in seconds. */
  readonly downloadTtlSeconds: number;
  /** Retry attempts for the malware scan job. */
  readonly scanAttempts?: number;
}

export interface EvidenceServiceDeps {
  readonly store: EvidenceStore;
  readonly objectStore: ObjectStore;
  /** Cipher bound to the acting tenant's data key. */
  readonly cipher: FileCipher;
  readonly signer: SignedUrlSigner;
  readonly queue: JobQueue;
  /** The acting tenant (used for object keys and to scope the scan job). */
  readonly tenant: TenantContext;
  readonly config: EvidenceServiceConfig;
}

function objectKeyFor(
  tenant: TenantContext,
  evidenceId: string,
  version: number,
): string {
  return `${tenant.schemaName}/evidence/${evidenceId}/v${version}`;
}

/**
 * Orchestrates evidence handling on top of the tenant-scoped store and object
 * store. Every upload is validated, hashed, encrypted at rest with the
 * per-tenant data key, persisted in quarantine, and queued for an asynchronous
 * malware scan. Downloads are gated on a successful scan and issued as
 * short-lived signed URLs; there is no path to bytes that bypasses the scan
 * gate.
 */
export class EvidenceService {
  constructor(private readonly deps: EvidenceServiceDeps) {}

  async upload(input: UploadInput): Promise<UploadResult> {
    const { config } = this.deps;
    if (!config.allowedContentTypes.includes(input.contentType)) {
      throw new UnsupportedFileTypeError(
        `Content type '${input.contentType}' is not allowed.`,
      );
    }
    if (input.bytes.length > config.maxBytes) {
      throw new FileTooLargeError(
        `File of ${input.bytes.length} bytes exceeds the ${config.maxBytes}-byte limit.`,
      );
    }

    const evidenceId = input.evidenceId ?? randomUUID();
    const contentHash = sha256Hex(input.bytes);
    const version = (await this.deps.store.latestVersion(evidenceId)) + 1;
    const versionHash = sha256Hex(`${evidenceId}:${version}:${contentHash}`);
    const objectKey = objectKeyFor(this.deps.tenant, evidenceId, version);

    // Encrypt at rest with the per-tenant data key before anything is stored.
    const sealed = await this.deps.cipher.sealBytes(input.bytes);
    await this.deps.objectStore.put(objectKey, sealed);

    await this.deps.store.create({
      evidenceId,
      version,
      versionHash,
      contentHash,
      fileName: input.fileName,
      contentType: input.contentType,
      sizeBytes: input.bytes.length,
      links: input.links,
      objectKey,
    });

    // The scan never runs synchronously in the request path — it is a job.
    await this.deps.queue.enqueue<MalwareScanPayload>({
      name: MALWARE_SCAN_JOB,
      tenant: this.deps.tenant,
      payload: { evidenceId, version, objectKey },
      options: {
        attempts: config.scanAttempts ?? 3,
        backoff: { type: "exponential", delayMs: 250 },
      },
    });

    return { evidenceId, version, versionHash, scanStatus: "quarantined" };
  }

  /**
   * Issues a short-lived signed download URL. Requires READ authorization (via
   * the store) and refuses unless the file has cleared scanning — so a
   * quarantined/infected file never yields a URL. The grant is audit-logged.
   */
  async createDownloadUrl(
    evidenceId: string,
    version: number,
  ): Promise<SignedUrl> {
    const metadata = await this.requireClean(evidenceId, version);
    const signed = this.deps.signer.sign(
      { key: metadata.objectKey, evidenceId, version },
      this.deps.config.downloadTtlSeconds,
    );
    await this.deps.store.recordDownloadGrant({
      evidenceId,
      version,
      objectKey: metadata.objectKey,
      expiresAt: signed.expiresAt,
    });
    return signed;
  }

  /**
   * Resolves a signed token to the decrypted bytes. Defense in depth: it
   * re-verifies the scan gate, so even a validly-signed token cannot retrieve a
   * file that is not clean.
   */
  async resolveDownload(
    token: string,
  ): Promise<{ readonly metadata: EvidenceMetadata; readonly bytes: Buffer }> {
    const payload = this.deps.signer.verify(token);
    const metadata = await this.requireClean(
      payload.evidenceId,
      payload.version,
    );
    const stored = await this.deps.objectStore.get(metadata.objectKey);
    if (!stored) {
      throw new StorageError(
        `Evidence object '${metadata.objectKey}' missing.`,
      );
    }
    const bytes = await this.deps.cipher.openBytes(stored);
    return { metadata, bytes };
  }

  list(): Promise<EvidenceMetadata[]> {
    return this.deps.store.list();
  }

  private async requireClean(
    evidenceId: string,
    version: number,
  ): Promise<EvidenceMetadata> {
    const metadata = await this.deps.store.get(evidenceId, version);
    if (!metadata) {
      throw new EvidenceNotFoundError(
        `Evidence '${evidenceId}' v${version} not found.`,
      );
    }
    if (metadata.scanStatus !== "clean") {
      throw new EvidenceNotReadyError(
        `Evidence '${evidenceId}' v${version} is '${metadata.scanStatus}', not downloadable.`,
      );
    }
    return metadata;
  }
}
