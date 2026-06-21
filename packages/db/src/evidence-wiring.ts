import type { AuthSession } from "@eqa/auth";
import type { Kms } from "@eqa/crypto";
import { TenantCipher } from "@eqa/crypto";
import type { JobHandlerMap, JobQueue } from "@eqa/jobs";
import {
  createMalwareScanHandler,
  EvidenceService,
  MALWARE_SCAN_JOB,
  type EvidenceServiceConfig,
  type MalwareScanner,
  type ObjectStore,
  type SignedUrlSigner,
} from "@eqa/storage";
import type { Database } from "./database";
import { createEvidenceScanStatusWriter } from "./evidence-system";
import type { TenantRegistry } from "./registry";
import { createTenantRepositories } from "./repositories";

export interface EvidenceJobHandlerDeps {
  readonly db: Database;
  readonly kms: Kms;
  readonly registry: TenantRegistry;
  readonly objectStore: ObjectStore;
  readonly scanner: MalwareScanner;
}

export interface EvidenceRuntimeDeps extends EvidenceJobHandlerDeps {
  readonly signer: SignedUrlSigner;
  readonly config: EvidenceServiceConfig;
}

export function createEvidenceJobHandlers(
  deps: EvidenceJobHandlerDeps,
): JobHandlerMap {
  return {
    [MALWARE_SCAN_JOB]: createMalwareScanHandler({
      objectStore: deps.objectStore,
      scanner: deps.scanner,
      cipherFor: async (tenant) =>
        new TenantCipher(
          deps.kms,
          await deps.registry.getEncryptedDataKey(tenant.slug),
        ),
      statusWriter: createEvidenceScanStatusWriter(deps.db),
    }),
  };
}

export async function createEvidenceServiceForSession(
  deps: EvidenceRuntimeDeps,
  session: AuthSession,
  queue: JobQueue,
): Promise<EvidenceService> {
  const repos = createTenantRepositories(deps.db, session);
  const cipher = new TenantCipher(
    deps.kms,
    await deps.registry.getEncryptedDataKey(session.tenant.slug),
  );
  return new EvidenceService({
    store: repos.evidence,
    objectStore: deps.objectStore,
    cipher,
    signer: deps.signer,
    queue,
    tenant: session.tenant,
    config: deps.config,
  });
}
