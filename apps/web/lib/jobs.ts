import type { AuthSession } from "@eqa/auth";
import { createTenantJobAuditPort, createUiActionHandlers } from "@eqa/db";
import { createJobQueueFromEnv, type JobQueue } from "@eqa/jobs";
import { getAppDatabase } from "./db";

let cachedQueue: JobQueue | undefined;

export function getUiActionQueue(): JobQueue {
  if (!cachedQueue) {
    const db = getAppDatabase();
    cachedQueue = createJobQueueFromEnv({
      handlers: createUiActionHandlers(db),
      auditPort: createTenantJobAuditPort(db),
    });
  }
  return cachedQueue;
}

export async function enqueueUiActionJob(
  name: string,
  session: AuthSession,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const queue = getUiActionQueue();
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
