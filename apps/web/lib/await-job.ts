import type { JobQueue, JobRecord } from "@eqa/jobs";

const POLL_MS = 25;
const TIMEOUT_MS = 30_000;

/** Polls until a job completes or fails (in-memory queue finishes quickly). */
export async function awaitJob(
  queue: JobQueue,
  jobId: string,
): Promise<JobRecord> {
  const start = Date.now();
  while (Date.now() - start < TIMEOUT_MS) {
    const record = await queue.getStatus(jobId);
    if (!record) {
      throw new Error(`Job '${jobId}' not found.`);
    }
    if (record.status === "completed" || record.status === "failed") {
      return record;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  throw new Error(`Job '${jobId}' timed out.`);
}
