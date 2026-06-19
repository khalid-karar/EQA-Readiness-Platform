import { randomUUID } from "node:crypto";
import type { TenantContext } from "@eqa/tenant";
import { computeBackoffDelay } from "./backoff";
import { NoHandlerError } from "./errors";
import { assertResolvedTenant } from "./tenant-guard";
import type {
  BackoffPolicy,
  EnqueueSpec,
  JobAuditPort,
  JobFailureLogger,
  JobHandlerMap,
  JobHandle,
  JobQueue,
  JobRecord,
  JobStatus,
} from "./types";

export interface InMemoryJobQueueDeps {
  readonly auditPort?: JobAuditPort;
  readonly failureLogger?: JobFailureLogger;
  /**
   * Injectable delay used between retries. Defaults to a real timer; tests pass
   * an immediate resolver to keep backoff deterministic and fast.
   */
  readonly delay?: (ms: number) => Promise<void>;
}

interface MutableJob {
  readonly id: string;
  readonly name: string;
  readonly tenant: TenantContext;
  readonly payload: unknown;
  readonly maxAttempts: number;
  readonly backoff: BackoffPolicy | undefined;
  status: JobStatus;
  attemptsMade: number;
  error: string | null;
  result: unknown;
}

function defaultDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * In-memory {@link JobQueue} for local/dev and tests — same interface as the
 * production BullMQ adapter, so nothing about callers changes between them.
 * Implements retry-with-backoff, status tracking, failure logging, the tenant
 * guard, and audit-logging of outcomes.
 */
export class InMemoryJobQueue implements JobQueue {
  private readonly jobs = new Map<string, MutableJob>();
  private readonly delay: (ms: number) => Promise<void>;
  private pending = 0;
  private idleWaiters: Array<() => void> = [];

  constructor(
    private readonly handlers: JobHandlerMap,
    private readonly deps: InMemoryJobQueueDeps = {},
  ) {
    this.delay = deps.delay ?? defaultDelay;
  }

  start(): void {
    // In-memory processing is driven automatically on enqueue; nothing to start.
  }

  enqueue<T>(spec: EnqueueSpec<T>): Promise<JobHandle> {
    const id = randomUUID();
    const job: MutableJob = {
      id,
      name: spec.name,
      tenant: spec.tenant,
      payload: spec.payload,
      maxAttempts: Math.max(1, spec.options?.attempts ?? 1),
      backoff: spec.options?.backoff,
      status: "waiting",
      attemptsMade: 0,
      error: null,
      result: undefined,
    };
    this.jobs.set(id, job);
    this.pending += 1;
    queueMicrotask(() => {
      void this.run(id);
    });
    return Promise.resolve({ id });
  }

  private async run(id: string): Promise<void> {
    const job = this.jobs.get(id);
    if (!job) return;

    job.status = "active";
    job.attemptsMade += 1;
    const attempt = job.attemptsMade;

    try {
      assertResolvedTenant(job.tenant);
      const handler = this.handlers[job.name];
      if (!handler) throw new NoHandlerError(job.name);

      const result = await handler({
        jobId: job.id,
        name: job.name,
        tenant: job.tenant,
        payload: job.payload,
        attempt,
      });

      job.status = "completed";
      job.result = result;
      job.error = null;
      await this.audit({
        tenant: job.tenant,
        jobId: job.id,
        jobName: job.name,
        status: "completed",
        attempt,
        outputSummary: result,
      });
      this.settle();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.logFailure(job, attempt, message);

      if (attempt < job.maxAttempts) {
        job.status = "delayed";
        await this.delay(computeBackoffDelay(job.backoff, attempt));
        this.run(id).catch(() => {
          /* run never rejects; guard for safety */
        });
        return;
      }

      job.status = "failed";
      job.error = message;
      await this.audit({
        tenant: job.tenant,
        jobId: job.id,
        jobName: job.name,
        status: "failed",
        attempt,
        error: message,
      });
      this.settle();
    }
  }

  private async audit(
    outcome: Parameters<JobAuditPort["record"]>[0],
  ): Promise<void> {
    try {
      await this.deps.auditPort?.record(outcome);
    } catch {
      // Auditing must never break job execution; swallow.
    }
  }

  private async logFailure(
    job: MutableJob,
    attempt: number,
    message: string,
  ): Promise<void> {
    try {
      await this.deps.failureLogger?.recordFailure({
        jobId: job.id,
        name: job.name,
        tenantId: job.tenant ? job.tenant.tenantId : null,
        attempt,
        error: message,
        at: new Date().toISOString(),
      });
    } catch {
      // Never let failure logging itself break the worker.
    }
  }

  private settle(): void {
    this.pending -= 1;
    if (this.pending === 0) {
      const waiters = this.idleWaiters;
      this.idleWaiters = [];
      for (const resolve of waiters) resolve();
    }
  }

  /** Resolves when no jobs are waiting, active, or delayed. */
  onIdle(): Promise<void> {
    if (this.pending === 0) return Promise.resolve();
    return new Promise((resolve) => this.idleWaiters.push(resolve));
  }

  getStatus(jobId: string): Promise<JobRecord | null> {
    const job = this.jobs.get(jobId);
    if (!job) return Promise.resolve(null);
    const record: JobRecord = {
      id: job.id,
      name: job.name,
      tenantId: job.tenant ? job.tenant.tenantId : "",
      status: job.status,
      attemptsMade: job.attemptsMade,
      maxAttempts: job.maxAttempts,
      error: job.error,
      result: job.result,
    };
    return Promise.resolve(record);
  }

  close(): Promise<void> {
    return Promise.resolve();
  }
}
