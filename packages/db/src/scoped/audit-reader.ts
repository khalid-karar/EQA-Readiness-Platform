import { AuditLog, type AuditEntry, type VerifyResult } from "@eqa/audit-log";
import { type AuthSession, authorize, PERMISSIONS } from "@eqa/auth";
import { TenantAuditStore } from "./audit-store";
import type { ScopedExecutor } from "./scoped-executor";

/**
 * Read-only view of the tenant's audit log for feature code. Exposes only
 * `list` and `verify` (both require READ) — there is intentionally no append,
 * update, or delete, so the log cannot be altered or removed through the app.
 * Appends happen automatically inside repository mutations (see
 * {@link AuditedRepository}).
 */
export class TenantAuditReader {
  private readonly audit: AuditLog;

  constructor(
    exec: ScopedExecutor,
    private readonly session: AuthSession,
  ) {
    this.audit = new AuditLog(new TenantAuditStore(exec), {
      userId: session.userId,
      role: session.role,
    });
  }

  list(): Promise<AuditEntry[]> {
    authorize(this.session, PERMISSIONS.READ);
    return this.audit.list();
  }

  verify(): Promise<VerifyResult> {
    authorize(this.session, PERMISSIONS.READ);
    return this.audit.verify();
  }
}
