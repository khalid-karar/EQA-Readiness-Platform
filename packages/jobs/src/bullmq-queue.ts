import { type ConnectionOptions, type Job, Queue, Worker } from "bullmq";
import type { TenantContext } from "@eqa/tenant";
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

interface JobData {
  readonly tenant: TenantContext;
  readonly payload: unknown;
}

export interface BullMqJobQueueDeps {
  readonly auditPort?: JobAuditPort;
  readonly failureLogger?: JobFailureLogger;
}

function mapBackoff(
  policy: BackoffPolicy | undefined,
): { type: string; delay: number } | undefined {
  return policy ? { type: policy.type, delay: policy.delayMs } : undefined;
}

function mapState(state: string): JobStatus {
  switch (state) {
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "active":
      return "active";
    case "delayed":
      return "delayed";
    default:
      return "waiting";
  }
}

/**
 * Production {@link JobQueue} backed by Redis + BullMQ. Connection details come
 * from config (host/port/region of the KSA Redis), never hardcoded. Retries and
 * backoff use BullMQ's native attempt/backoff support. The Queue/Worker connect
 * lazily, so the adapter is constructible (and config-swappable) without a live
 * Redis.
 */
export class BullMqJobQueue implements JobQueue {
  private queue?: Queue<JobData>;
  private worker?: Worker<JobData>;

  constructor(
    private readonly queueName: string,
    private readonly connection: ConnectionOptions,
    private readonly handlers: JobHandlerMap,
    private readonly deps: BullMqJobQueueDeps = {},
  ) {}

  private getQueue(): Queue<JobData> {
    this.queue ??= new Queue<JobData>(this.queueName, {
      connection: this.connection,
    });
    return this.queue;
  }

  start(): void {
    if (this.worker) return;
    this.worker = new Worker<JobData>(
      this.queueName,
      async (job: Job<JobData>) => {
        assertResolvedTenant(job.data.tenant);
        const handler = this.handlers[job.name];
        if (!handler) throw new NoHandlerError(job.name);
        const attempt = job.attemptsMade + 1;
        const result = await handler({
          jobId: job.id ?? "",
          name: job.name,
          tenant: job.data.tenant,
          payload: job.data.payload,
          attempt,
        });
        await this.deps.auditPort?.record({
          tenant: job.data.tenant,
          jobId: job.id ?? "",
          jobName: job.name,
          status: "completed",
          attempt,
          outputSummary: result,
        });
        return result;
      },
      { connection: this.connection },
    );

    this.worker.on("failed", (job: Job<JobData> | undefined, error: Error) => {
      if (!job) return;
      const attempt = job.attemptsMade;
      void this.deps.failureLogger?.recordFailure({
        jobId: job.id ?? "",
        name: job.name,
        tenantId: job.data.tenant ? job.data.tenant.tenantId : null,
        attempt,
        error: error.message,
        at: new Date().toISOString(),
      });
      const maxAttempts = job.opts.attempts ?? 1;
      if (attempt >= maxAttempts) {
        void this.deps.auditPort?.record({
          tenant: job.data.tenant,
          jobId: job.id ?? "",
          jobName: job.name,
          status: "failed",
          attempt,
          error: error.message,
        });
      }
    });
  }

  async enqueue<T>(spec: EnqueueSpec<T>): Promise<JobHandle> {
    const opts: {
      attempts: number;
      backoff?: { type: string; delay: number };
    } = { attempts: Math.max(1, spec.options?.attempts ?? 1) };
    const backoff = mapBackoff(spec.options?.backoff);
    if (backoff) opts.backoff = backoff;

    const job = await this.getQueue().add(
      spec.name,
      { tenant: spec.tenant, payload: spec.payload },
      opts,
    );
    return { id: job.id ?? "" };
  }

  async getStatus(jobId: string): Promise<JobRecord | null> {
    const job = await this.getQueue().getJob(jobId);
    if (!job) return null;
    const state = await job.getState();
    return {
      id: job.id ?? jobId,
      name: job.name,
      tenantId: job.data.tenant ? job.data.tenant.tenantId : "",
      status: mapState(state),
      attemptsMade: job.attemptsMade,
      maxAttempts: job.opts.attempts ?? 1,
      error: job.failedReason ?? null,
      result: job.returnvalue,
    };
  }

  async close(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }
}
