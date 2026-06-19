/**
 * @eqa/jobs
 *
 * Tenant-scoped background job framework. All long-running work — malware
 * scanning, AI review, document processing, exports — runs here, never inside
 * synchronous request handlers. Every job executes within a resolved tenant
 * context (Step 2), retries with backoff, tracks status through its lifecycle,
 * logs failures, and audit-logs its outcome through the Step 4 audit path.
 *
 * The backend is swappable by config: an in-memory adapter for local/dev and
 * tests, and a Redis/BullMQ adapter for production — same {@link JobQueue}
 * interface, no hardcoded vendor.
 */

export { computeBackoffDelay } from "./backoff";
export { JobError, JobNotFoundError, NoHandlerError } from "./errors";
export { assertResolvedTenant } from "./tenant-guard";
export { InMemoryJobQueue, type InMemoryJobQueueDeps } from "./in-memory-queue";
export { BullMqJobQueue, type BullMqJobQueueDeps } from "./bullmq-queue";
export {
  createJobQueue,
  createJobQueueFromEnv,
  type JobQueueConfig,
  type JobQueueDeps,
  type JobQueueDriver,
  type RedisConnectionConfig,
} from "./factory";
export type {
  BackoffPolicy,
  EnqueueSpec,
  JobAuditPort,
  JobContext,
  JobFailureEntry,
  JobFailureLogger,
  JobHandle,
  JobHandler,
  JobHandlerMap,
  JobOptions,
  JobOutcomeAudit,
  JobQueue,
  JobRecord,
  JobStatus,
} from "./types";
