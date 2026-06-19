import type { TenantContext } from "@eqa/tenant";

/** Lifecycle states a job moves through. */
export type JobStatus =
  | "waiting"
  | "active"
  | "delayed"
  | "completed"
  | "failed";

/** Retry backoff policy applied between attempts. */
export interface BackoffPolicy {
  readonly type: "fixed" | "exponential";
  readonly delayMs: number;
}

/** Per-job execution options. */
export interface JobOptions {
  /** Total attempts including the first (default 1 — no retry). */
  readonly attempts?: number;
  readonly backoff?: BackoffPolicy;
}

/** What the caller provides to enqueue a job. */
export interface EnqueueSpec<T = unknown> {
  /** Job type, used to select the registered handler (e.g. "malware-scan"). */
  readonly name: string;
  /** The resolved tenant the job runs within. */
  readonly tenant: TenantContext;
  readonly payload: T;
  readonly options?: JobOptions;
}

/** Handle returned from enqueue. */
export interface JobHandle {
  readonly id: string;
}

/**
 * The context passed to a handler. The tenant is guaranteed resolved and valid —
 * a job never executes without a resolved tenant context.
 */
export interface JobContext<T = unknown> {
  readonly jobId: string;
  readonly name: string;
  readonly tenant: TenantContext;
  readonly payload: T;
  /** 1-based attempt number. */
  readonly attempt: number;
}

/** A handler for a job type. */
export type JobHandler<T = unknown, R = unknown> = (
  ctx: JobContext<T>,
) => Promise<R>;

/** Registry of handlers keyed by job name. */
export type JobHandlerMap = Record<string, JobHandler>;

/** A point-in-time view of a job, queryable through its lifecycle. */
export interface JobRecord {
  readonly id: string;
  readonly name: string;
  readonly tenantId: string;
  readonly status: JobStatus;
  readonly attemptsMade: number;
  readonly maxAttempts: number;
  readonly error: string | null;
  readonly result?: unknown;
}

/** A structured failure record written for every failed attempt. */
export interface JobFailureEntry {
  readonly jobId: string;
  readonly name: string;
  readonly tenantId: string | null;
  readonly attempt: number;
  readonly error: string;
  readonly at: string;
}

/** Sink for job failures (production: structured logging / alerting). */
export interface JobFailureLogger {
  recordFailure(entry: JobFailureEntry): void | Promise<void>;
}

/** A job outcome to be audit-logged. */
export interface JobOutcomeAudit {
  readonly tenant: TenantContext;
  readonly jobId: string;
  readonly jobName: string;
  readonly status: "completed" | "failed";
  readonly attempt: number;
  readonly outputSummary?: unknown;
  readonly error?: string;
}

/**
 * Port for audit-logging job outcomes. The concrete implementation writes
 * through the Step 4 tenant-scoped audit path (AuditedRepository / AuditLog), so
 * job outputs are audited and tenant-isolated. Kept as a port so the framework
 * does not depend on the data layer.
 */
export interface JobAuditPort {
  record(outcome: JobOutcomeAudit): Promise<void>;
}

/**
 * The job queue: enqueue work, process it through registered handlers within the
 * tenant context, and query status. Implemented by swappable adapters (in-memory
 * for dev/tests, Redis/BullMQ for production) behind this one interface.
 */
export interface JobQueue {
  /** Begins processing (starts worker(s)). */
  start(): void | Promise<void>;
  enqueue<T>(spec: EnqueueSpec<T>): Promise<JobHandle>;
  getStatus(jobId: string): Promise<JobRecord | null>;
  close(): Promise<void>;
}
