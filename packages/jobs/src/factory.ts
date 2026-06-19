import type { ConnectionOptions } from "bullmq";
import type { RedisOptions } from "ioredis";
import { BullMqJobQueue } from "./bullmq-queue";
import { JobError } from "./errors";
import { InMemoryJobQueue } from "./in-memory-queue";
import type {
  JobAuditPort,
  JobFailureLogger,
  JobHandlerMap,
  JobQueue,
} from "./types";

/** Which backend the queue uses. Swappable by config — no hardcoded vendor. */
export type JobQueueDriver = "memory" | "bullmq";

export interface RedisConnectionConfig {
  readonly host: string;
  readonly port: number;
  readonly password?: string;
}

export interface JobQueueConfig {
  readonly driver: JobQueueDriver;
  readonly queueName?: string;
  /** Required when driver is "bullmq". */
  readonly redis?: RedisConnectionConfig;
}

export interface JobQueueDeps {
  readonly handlers: JobHandlerMap;
  readonly auditPort?: JobAuditPort;
  readonly failureLogger?: JobFailureLogger;
  /** In-memory backoff timer override (tests). */
  readonly delay?: (ms: number) => Promise<void>;
}

const DEFAULT_QUEUE_NAME = "eqa-jobs";

/** Builds a job queue for the configured driver. */
export function createJobQueue(
  config: JobQueueConfig,
  deps: JobQueueDeps,
): JobQueue {
  switch (config.driver) {
    case "memory":
      return new InMemoryJobQueue(deps.handlers, deps);
    case "bullmq": {
      if (!config.redis) {
        throw new JobError(
          "The 'bullmq' driver requires a redis connection config.",
        );
      }
      const connection: RedisOptions = {
        host: config.redis.host,
        port: config.redis.port,
      };
      if (config.redis.password) connection.password = config.redis.password;
      return new BullMqJobQueue(
        config.queueName ?? DEFAULT_QUEUE_NAME,
        connection as ConnectionOptions,
        deps.handlers,
        deps,
      );
    }
  }
}

/**
 * Builds a job queue from environment variables (production wiring):
 * - JOB_QUEUE_DRIVER = "memory" | "bullmq" (default "memory")
 * - JOB_QUEUE_NAME (optional)
 * - REDIS_HOST / REDIS_PORT / REDIS_PASSWORD (for "bullmq")
 */
export function createJobQueueFromEnv(
  deps: JobQueueDeps,
  env: NodeJS.ProcessEnv = process.env,
): JobQueue {
  const driver: JobQueueDriver =
    env.JOB_QUEUE_DRIVER === "bullmq" ? "bullmq" : "memory";

  if (driver === "memory") {
    const config: JobQueueConfig = { driver: "memory" };
    return createJobQueue(config, deps);
  }

  const redis: RedisConnectionConfig = {
    host: env.REDIS_HOST ?? "127.0.0.1",
    port: Number(env.REDIS_PORT ?? "6379"),
  };
  const withPassword: RedisConnectionConfig = env.REDIS_PASSWORD
    ? { ...redis, password: env.REDIS_PASSWORD }
    : redis;

  const config: JobQueueConfig = env.JOB_QUEUE_NAME
    ? { driver: "bullmq", redis: withPassword, queueName: env.JOB_QUEUE_NAME }
    : { driver: "bullmq", redis: withPassword };

  return createJobQueue(config, deps);
}
