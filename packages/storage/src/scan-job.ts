import type { JobHandler } from "@eqa/jobs";
import type { TenantContext } from "@eqa/tenant";
import { StorageError } from "./errors";
import type {
  EvidenceScanStatus,
  EvidenceScanStatusWriter,
  FileCipher,
  MalwareScanner,
  ObjectStore,
} from "./types";

/** The job name under which the malware scan handler is registered. */
export const MALWARE_SCAN_JOB = "evidence:malware-scan";

/** Payload enqueued for each uploaded evidence version. */
export interface MalwareScanPayload {
  readonly evidenceId: string;
  readonly version: number;
  readonly objectKey: string;
}

export interface MalwareScanOutcome {
  readonly status: EvidenceScanStatus;
  readonly scanner: string;
}

export interface MalwareScanJobDeps {
  readonly objectStore: ObjectStore;
  readonly scanner: MalwareScanner;
  /** Builds the per-tenant file cipher for the job's resolved tenant. */
  cipherFor(tenant: TenantContext): FileCipher | Promise<FileCipher>;
  readonly statusWriter: EvidenceScanStatusWriter;
}

/**
 * Builds the malware-scan job handler. It runs inside the job framework's
 * resolved tenant context (Step 6.5): it reads the encrypted bytes, decrypts
 * them with the per-tenant data key, scans them, and records the result through
 * the tenant-scoped, system-audited status writer. The job's own outcome is
 * audited by the queue's audit port. A file is only ever marked `clean` here —
 * never in the request path — so it stays quarantined until this job succeeds.
 */
export function createMalwareScanHandler(deps: MalwareScanJobDeps): JobHandler {
  return async (ctx) => {
    const { evidenceId, version, objectKey } =
      ctx.payload as MalwareScanPayload;

    const stored = await deps.objectStore.get(objectKey);
    if (!stored) {
      throw new StorageError(
        `Evidence object '${objectKey}' not found for scanning.`,
      );
    }

    const cipher = await deps.cipherFor(ctx.tenant);
    const plaintext = await cipher.openBytes(stored);
    const result = await deps.scanner.scan(plaintext);
    const status: EvidenceScanStatus = result.clean ? "clean" : "infected";

    await deps.statusWriter.setScanStatus(
      ctx.tenant,
      evidenceId,
      version,
      status,
      result.scanner,
    );

    const outcome: MalwareScanOutcome = { status, scanner: result.scanner };
    return outcome;
  };
}
