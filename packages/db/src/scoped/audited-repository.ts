import { AuditLog, type AuditAction } from "@eqa/audit-log";
import type { AuthSession } from "@eqa/auth";
import { TenantAuditStore } from "./audit-store";
import type { ScopedExecutor } from "./scoped-executor";

/** Placeholder written into the audit log instead of sensitive plaintext. */
const REDACTED = "[redacted]";

interface RecordWriteOptions<T> {
  /** Logical entity/table affected, e.g. "tenant_kv". */
  readonly entity: string;
  /** Identifier of the affected record. */
  readonly entityId: string;
  /** Reads the current stored value (used for the before/after snapshots). */
  readValue: () => Promise<unknown>;
  /** Performs the actual mutation. */
  write: () => Promise<T>;
  /** Overrides the auto-detected create/update action. */
  readonly action?: AuditAction;
  /**
   * When true, the value is sensitive: the audit entry records a redaction
   * marker instead of the real before/after values, so secrets never leak into
   * the (un-encrypted) audit log.
   */
  readonly redact?: boolean;
}

/**
 * Base class that makes audit logging a cross-cutting concern: any repository
 * that extends it and routes its mutations through {@link recordWrite} gets an
 * append-only, hash-chained audit entry written automatically — through the same
 * tenant-scoped path — without re-implementing audit logic by hand.
 */
export abstract class AuditedRepository {
  protected readonly audit: AuditLog;

  protected constructor(
    protected readonly exec: ScopedExecutor,
    protected readonly session: AuthSession,
  ) {
    this.audit = new AuditLog(new TenantAuditStore(exec), {
      userId: session.userId,
      role: session.role,
    });
  }

  protected async recordWrite<T>(options: RecordWriteOptions<T>): Promise<T> {
    const before = await options.readValue();
    const result = await options.write();
    const after = await options.readValue();

    const existedBefore = before !== null && before !== undefined;
    const action: AuditAction =
      options.action ?? (existedBefore ? "update" : "create");

    await this.audit.append({
      action,
      entity: options.entity,
      entityId: options.entityId,
      oldValue: options.redact ? (existedBefore ? REDACTED : null) : before,
      newValue: options.redact ? REDACTED : after,
    });

    return result;
  }
}
