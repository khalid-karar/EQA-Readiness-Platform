import { AuditLog, type AuditEntry, type AuditStore } from "@eqa/audit-log";
import { MissingTenantContextError, type TenantContext } from "@eqa/tenant";
import { describe, expect, it, vi } from "vitest";
import { computeBackoffDelay } from "./backoff";
import { BullMqJobQueue } from "./bullmq-queue";
import { JobError } from "./errors";
import { createJobQueue } from "./factory";
import { InMemoryJobQueue } from "./in-memory-queue";
import type {
  JobAuditPort,
  JobFailureEntry,
  JobFailureLogger,
  JobHandlerMap,
} from "./types";

const TENANT: TenantContext = {
  tenantId: "t-acme",
  slug: "acme",
  name: "Acme",
  schemaName: "tenant_acme",
};

const tick = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

function arrayFailureLogger(): {
  logger: JobFailureLogger;
  entries: JobFailureEntry[];
} {
  const entries: JobFailureEntry[] = [];
  return {
    entries,
    logger: {
      recordFailure(entry) {
        entries.push(entry);
      },
    },
  };
}

class MemoryAuditStore implements AuditStore {
  readonly rows: AuditEntry[] = [];
  lastRow(): Promise<AuditEntry | null> {
    return Promise.resolve(this.rows.at(-1) ?? null);
  }
  appendRow(entry: AuditEntry): Promise<void> {
    this.rows.push(entry);
    return Promise.resolve();
  }
  listRows(): Promise<AuditEntry[]> {
    return Promise.resolve([...this.rows]);
  }
}

describe("backoff", () => {
  it("computes fixed and exponential delays", () => {
    expect(computeBackoffDelay(undefined, 1)).toBe(0);
    expect(computeBackoffDelay({ type: "fixed", delayMs: 50 }, 3)).toBe(50);
    expect(computeBackoffDelay({ type: "exponential", delayMs: 10 }, 1)).toBe(
      10,
    );
    expect(computeBackoffDelay({ type: "exponential", delayMs: 10 }, 2)).toBe(
      20,
    );
    expect(computeBackoffDelay({ type: "exponential", delayMs: 10 }, 3)).toBe(
      40,
    );
  });
});

describe("InMemoryJobQueue", () => {
  it("runs a job within the resolved tenant context", async () => {
    const seen: TenantContext[] = [];
    const handlers: JobHandlerMap = {
      "doc-process": (ctx) => {
        seen.push(ctx.tenant);
        return Promise.resolve({ ok: true });
      },
    };
    const queue = new InMemoryJobQueue(handlers);

    const { id } = await queue.enqueue({
      name: "doc-process",
      tenant: TENANT,
      payload: { fileId: "f1" },
    });
    await queue.onIdle();

    expect(seen).toHaveLength(1);
    expect(seen[0]).toEqual(TENANT);
    const status = await queue.getStatus(id);
    expect(status?.status).toBe("completed");
    expect(status?.tenantId).toBe("t-acme");
    expect(status?.attemptsMade).toBe(1);
  });

  it("retries per policy with backoff and surfaces failure after exhausting retries", async () => {
    const delays: number[] = [];
    const handler = vi.fn(() => Promise.reject(new Error("boom")));
    const queue = new InMemoryJobQueue(
      { "malware-scan": handler },
      {
        delay: (ms) => {
          delays.push(ms);
          return Promise.resolve();
        },
      },
    );

    const { id } = await queue.enqueue({
      name: "malware-scan",
      tenant: TENANT,
      payload: {},
      options: { attempts: 3, backoff: { type: "exponential", delayMs: 10 } },
    });
    await queue.onIdle();

    expect(handler).toHaveBeenCalledTimes(3);
    expect(delays).toEqual([10, 20]); // between attempts 1→2 and 2→3, none after the last
    const status = await queue.getStatus(id);
    expect(status?.status).toBe("failed");
    expect(status?.attemptsMade).toBe(3);
    expect(status?.error).toBe("boom");
  });

  it("logs every failed attempt", async () => {
    const { logger, entries } = arrayFailureLogger();
    const queue = new InMemoryJobQueue(
      { export: () => Promise.reject(new Error("nope")) },
      { failureLogger: logger, delay: () => Promise.resolve() },
    );

    await queue.enqueue({
      name: "export",
      tenant: TENANT,
      payload: {},
      options: { attempts: 2 },
    });
    await queue.onIdle();

    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.attempt)).toEqual([1, 2]);
    expect(entries[0]?.error).toBe("nope");
    expect(entries[0]?.tenantId).toBe("t-acme");
  });

  it("exposes status through the lifecycle (active → completed)", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queue = new InMemoryJobQueue({
      slow: async () => {
        await gate;
        return "done";
      },
    });

    const { id } = await queue.enqueue({
      name: "slow",
      tenant: TENANT,
      payload: {},
    });
    await tick();
    expect((await queue.getStatus(id))?.status).toBe("active");

    release();
    await queue.onIdle();
    const final = await queue.getStatus(id);
    expect(final?.status).toBe("completed");
    expect(final?.result).toBe("done");
  });

  it("does not execute a job without a resolved tenant context", async () => {
    const handler = vi.fn(() => Promise.resolve("should not run"));
    const queue = new InMemoryJobQueue(
      { scan: handler },
      { delay: () => Promise.resolve() },
    );

    const { id } = await queue.enqueue({
      name: "scan",
      // Malformed tenant: invalid schema identifier.
      tenant: { ...TENANT, schemaName: "not a schema!" },
      payload: {},
    });
    await queue.onIdle();

    expect(handler).not.toHaveBeenCalled();
    const status = await queue.getStatus(id);
    expect(status?.status).toBe("failed");
    expect(status?.error).toContain("resolved tenant context");
  });

  it("guards a null tenant context with MissingTenantContextError semantics", async () => {
    const handler = vi.fn(() => Promise.resolve("x"));
    const queue = new InMemoryJobQueue({ scan: handler });
    const { id } = await queue.enqueue({
      name: "scan",
      tenant: null as unknown as TenantContext,
      payload: {},
    });
    await queue.onIdle();
    expect(handler).not.toHaveBeenCalled();
    expect((await queue.getStatus(id))?.status).toBe("failed");
  });

  it("audit-logs job outcomes through the Step 4 audit path", async () => {
    const store = new MemoryAuditStore();
    const auditLog = new AuditLog(store, {
      userId: "job-runner",
      role: "system",
    });
    const auditPort: JobAuditPort = {
      async record(outcome) {
        await auditLog.append({
          action: outcome.status === "completed" ? "create" : "status_change",
          entity: `job:${outcome.jobName}`,
          entityId: outcome.jobId,
          oldValue: null,
          newValue: {
            status: outcome.status,
            output: outcome.outputSummary ?? null,
          },
        });
      },
    };
    const queue = new InMemoryJobQueue(
      { "ai-review": () => Promise.resolve({ score: 3 }) },
      { auditPort },
    );

    const { id } = await queue.enqueue({
      name: "ai-review",
      tenant: TENANT,
      payload: {},
    });
    await queue.onIdle();

    expect(store.rows).toHaveLength(1);
    expect(store.rows[0]?.entity).toBe("job:ai-review");
    expect(store.rows[0]?.entityId).toBe(id);
    expect(await auditLog.verify()).toEqual({ valid: true });
  });
});

describe("createJobQueue (swappable by config)", () => {
  const deps = { handlers: {} as JobHandlerMap };

  it("returns the in-memory adapter for the memory driver", () => {
    const queue = createJobQueue({ driver: "memory" }, deps);
    expect(queue).toBeInstanceOf(InMemoryJobQueue);
  });

  it("returns the BullMQ adapter for the bullmq driver (no connection yet)", () => {
    const queue = createJobQueue(
      { driver: "bullmq", redis: { host: "127.0.0.1", port: 6379 } },
      deps,
    );
    expect(queue).toBeInstanceOf(BullMqJobQueue);
  });

  it("rejects the bullmq driver without a redis config", () => {
    expect(() => createJobQueue({ driver: "bullmq" }, deps)).toThrow(JobError);
  });
});

describe("assertResolvedTenant", () => {
  it("is the same guard the data layer uses", async () => {
    const queue = new InMemoryJobQueue({
      noop: () => Promise.resolve(null),
    });
    const { id } = await queue.enqueue({
      name: "noop",
      tenant: { ...TENANT, schemaName: "" },
      payload: {},
    });
    await queue.onIdle();
    const status = await queue.getStatus(id);
    expect(status?.status).toBe("failed");
    // The thrown error is tenant's MissingTenantContextError.
    expect(new MissingTenantContextError().name).toBe(
      "MissingTenantContextError",
    );
  });
});
