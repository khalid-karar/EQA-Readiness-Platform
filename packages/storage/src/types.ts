import type { TenantContext } from "@eqa/tenant";

/**
 * The scan lifecycle of an evidence version. A file is `quarantined` on upload
 * and only becomes downloadable once a malware scan job marks it `clean`. An
 * `infected` file stays permanently undownloadable.
 */
export type EvidenceScanStatus = "quarantined" | "clean" | "infected";

/** Immutable description of a single uploaded evidence version. */
export interface EvidenceMetadata {
  readonly evidenceId: string;
  readonly version: number;
  /** Hash identifying this version (derived from content + identity). */
  readonly versionHash: string;
  /** SHA-256 of the original plaintext bytes. */
  readonly contentHash: string;
  readonly fileName: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  /** Standard/question ids this evidence supports. */
  readonly links: readonly string[];
  readonly scanStatus: EvidenceScanStatus;
  /** Identifier of the scanner that cleared/flagged it, once scanned. */
  readonly scanner: string | null;
  /** Object-store key holding the encrypted bytes. */
  readonly objectKey: string;
  readonly uploadedBy: string;
  readonly uploadedAt: string;
}

/** A new evidence version to persist (before scan; system fields filled by db). */
export interface NewEvidenceVersion {
  readonly evidenceId: string;
  readonly version: number;
  readonly versionHash: string;
  readonly contentHash: string;
  readonly fileName: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly links: readonly string[];
  readonly objectKey: string;
}

/** A short-lived download authorization recorded in the audit log. */
export interface DownloadGrant {
  readonly evidenceId: string;
  readonly version: number;
  readonly objectKey: string;
  readonly expiresAt: string;
}

/** Raw upload request handed to the service. Synthetic bytes only. */
export interface UploadInput {
  /** Omit to start a new logical evidence item; provide to add a new version. */
  readonly evidenceId?: string;
  readonly fileName: string;
  readonly contentType: string;
  readonly bytes: Buffer;
  readonly links: readonly string[];
}

export interface UploadResult {
  readonly evidenceId: string;
  readonly version: number;
  readonly versionHash: string;
  readonly scanStatus: EvidenceScanStatus;
}

/**
 * Persistence port for evidence metadata. Implemented by the tenant-scoped,
 * role-checked, auto-audited repository in @eqa/db — so the service never
 * touches the database directly and cannot bypass tenant scoping, RBAC, or
 * audit. (The encrypted bytes themselves live in the {@link ObjectStore}.)
 */
export interface EvidenceStore {
  /** Persists a new version in quarantine (requires WRITE). */
  create(version: NewEvidenceVersion): Promise<void>;
  /** Reads a version's metadata (requires READ). */
  get(evidenceId: string, version: number): Promise<EvidenceMetadata | null>;
  /** Highest stored version for an evidence id, or 0 (requires READ). */
  latestVersion(evidenceId: string): Promise<number>;
  /** All evidence versions for the tenant (requires READ). */
  list(): Promise<EvidenceMetadata[]>;
  /** Audit-logs that a (short-lived) download was authorized (requires READ). */
  recordDownloadGrant(grant: DownloadGrant): Promise<void>;
}

/**
 * System-side writer used by the malware-scan job to record a scan result. It is
 * tenant-scoped (takes the job's resolved {@link TenantContext}) and audited as a
 * system actor — it is a system action, not a user-initiated mutation, so it does
 * not carry a user's RBAC role.
 */
export interface EvidenceScanStatusWriter {
  setScanStatus(
    tenant: TenantContext,
    evidenceId: string,
    version: number,
    status: EvidenceScanStatus,
    scanner: string,
  ): Promise<void>;
}

/**
 * Object-storage abstraction. No vendor is hardcoded: the bucket/region are
 * config, so the KSA object store is swappable (in-memory for dev/tests, an
 * S3-compatible client in production).
 */
export interface ObjectStore {
  readonly bucket: string;
  put(key: string, bytes: Buffer): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}

/**
 * Encrypts/decrypts file bytes at rest with the per-tenant data key. Implemented
 * by @eqa/crypto's TenantCipher (sealBytes/openBytes) — the data layer's
 * envelope encryption, applied to evidence bytes.
 */
export interface FileCipher {
  sealBytes(plaintext: Buffer): Promise<Buffer>;
  openBytes(ciphertext: Buffer): Promise<Buffer>;
}

/** Result of a malware/AV scan. */
export interface MalwareScanResult {
  readonly clean: boolean;
  readonly scanner: string;
  readonly signature?: string;
}

/** Pluggable malware/AV scanner (runs only inside the scan job). */
export interface MalwareScanner {
  scan(bytes: Buffer): Promise<MalwareScanResult>;
}

/** Claims carried by a signed download URL. */
export interface SignedUrlPayload {
  readonly key: string;
  readonly evidenceId: string;
  readonly version: number;
}

export interface SignedUrl {
  readonly url: string;
  readonly token: string;
  readonly expiresAt: string;
}

/** Issues and verifies short-lived signed download URLs. */
export interface SignedUrlSigner {
  sign(payload: SignedUrlPayload, ttlSeconds: number): SignedUrl;
  /** Returns the payload, or throws if the token is invalid/tampered/expired. */
  verify(token: string): SignedUrlPayload;
}
