import type { AuthSession } from "@eqa/auth";
import { createTenantJobAuditPort, createUiActionHandlers } from "@eqa/db";
import { createJobQueueFromEnv, type JobQueue } from "@eqa/jobs";
import { getEvidenceJobHandlers } from "./evidence-runtime";
import { getReportJobHandlers } from "./report-runtime";
import { getAppDatabase } from "./db";

let cachedQueue: JobQueue | undefined;

export function getAppJobQueue(): JobQueue {
  if (!cachedQueue) {
    const db = getAppDatabase();
    cachedQueue = createJobQueueFromEnv({
      handlers: {
        ...createUiActionHandlers(db),
        ...getEvidenceJobHandlers(),
        ...getReportJobHandlers(),
      },
      auditPort: createTenantJobAuditPort(db),
    });
  }
  return cachedQueue;
}

/** @deprecated Use {@link getAppJobQueue}. */
export function getUiActionQueue(): JobQueue {
  return getAppJobQueue();
}

export async function enqueueUiActionJob(
  name: string,
  session: AuthSession,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const queue = getAppJobQueue();
  const { id } = await queue.enqueue({
    name,
    tenant: session.tenant,
    payload: {
      ...payload,
      userId: session.userId,
      role: session.role,
    },
  });
  const record = await (async () => {
    const { awaitJob } = await import("./await-job");
    return awaitJob(queue, id);
  })();
  if (record.status === "failed") {
    throw new Error(record.error ?? "Job failed.");
  }
  return record.result;
}

export async function awaitEvidenceScan(
  session: AuthSession,
  evidenceId: string,
  version: number,
  timeoutMs = 30_000,
): Promise<string> {
  const { createTenantRepositories } = await import("@eqa/db");
  const repos = createTenantRepositories(getAppDatabase(), session);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const meta = await repos.evidence.get(evidenceId, version);
    if (meta && meta.scanStatus !== "quarantined") {
      return meta.scanStatus;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Malware scan timed out.");
}
