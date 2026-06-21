import { createLocalKmsFromEnv } from "@eqa/crypto";
import {
  createEvidenceJobHandlers,
  createEvidenceServiceForSession,
  TenantRegistry,
  type EvidenceRuntimeDeps,
} from "@eqa/db";
import {
  createEvidenceServiceConfigFromEnv,
  createMalwareScannerFromEnv,
  createObjectStoreFromEnv,
  createSignedUrlSignerFromEnv,
} from "@eqa/storage";
import { getAppDatabase } from "./db";

let cachedRuntime: EvidenceRuntimeDeps | undefined;

export function getEvidenceRuntime(): EvidenceRuntimeDeps {
  if (!cachedRuntime) {
    const db = getAppDatabase();
    const kms = createLocalKmsFromEnv();
    const registry = new TenantRegistry(db, kms);
    cachedRuntime = {
      db,
      kms,
      registry,
      objectStore: createObjectStoreFromEnv(),
      scanner: createMalwareScannerFromEnv(),
      signer: createSignedUrlSignerFromEnv(),
      config: createEvidenceServiceConfigFromEnv(),
    };
  }
  return cachedRuntime;
}

export function getEvidenceJobHandlers(): ReturnType<
  typeof createEvidenceJobHandlers
> {
  return createEvidenceJobHandlers(getEvidenceRuntime());
}

export async function getEvidenceServiceForSession(
  session: Parameters<typeof createEvidenceServiceForSession>[1],
  queue: Parameters<typeof createEvidenceServiceForSession>[2],
) {
  return createEvidenceServiceForSession(
    getEvidenceRuntime(),
    session,
    queue,
  );
}
