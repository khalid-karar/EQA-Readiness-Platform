import type { TenantContext } from "@eqa/tenant";
import { ForbiddenError, TenantMismatchError } from "./errors";
import { can, type Permission, type Role } from "./roles";

/**
 * An authenticated principal. The tenant is bound here at authentication time
 * (from the verified token, never from a request header/parameter) together
 * with the user's single role. MFA is always satisfied — sessions are only
 * created after MFA is verified.
 */
export interface AuthSession {
  readonly userId: string;
  readonly tenant: TenantContext;
  readonly role: Role;
  readonly mfaAuthenticated: true;
}

/** Throws {@link ForbiddenError} unless the session's role grants `permission`. */
export function authorize(session: AuthSession, permission: Permission): void {
  if (!can(session.role, permission)) {
    throw new ForbiddenError(
      `Role '${session.role}' is not permitted to '${permission}'.`,
    );
  }
}

/**
 * Throws {@link TenantMismatchError} if `tenantId` is not the tenant bound to the
 * session. Guards against acting on a tenant other than the authenticated one.
 */
export function assertSameTenant(session: AuthSession, tenantId: string): void {
  if (session.tenant.tenantId !== tenantId) {
    throw new TenantMismatchError(
      `Session is bound to tenant '${session.tenant.tenantId}', cannot act on '${tenantId}'.`,
    );
  }
}
