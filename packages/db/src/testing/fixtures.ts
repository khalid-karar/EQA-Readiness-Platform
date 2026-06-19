import type { AuthSession, Role } from "@eqa/auth";
import type { TenantContext, TenantDescriptor } from "@eqa/tenant";

/** Builds a TenantContext from a registry descriptor (test helper). */
export function contextOf(t: TenantDescriptor): TenantContext {
  return {
    tenantId: t.id,
    slug: t.slug,
    name: t.name,
    schemaName: t.schemaName,
  };
}

/**
 * Builds a synthetic authenticated session bound to a tenant + role. Mirrors
 * what `authenticate()` produces from a verified token. Synthetic only.
 */
export function sessionFor(
  tenant: TenantContext,
  role: Role = "cae",
): AuthSession {
  return {
    userId: `user-${tenant.slug}-${role}`,
    tenant,
    role,
    mfaAuthenticated: true,
  };
}
