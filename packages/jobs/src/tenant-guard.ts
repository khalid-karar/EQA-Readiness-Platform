import {
  isValidIdentifier,
  MissingTenantContextError,
  type TenantContext,
} from "@eqa/tenant";

/**
 * Asserts a job has a resolved, valid tenant context before it executes. This is
 * the runtime backstop behind the rule that a job can never run outside a
 * resolved tenant scope — mirroring the data layer's ScopedExecutor guard.
 */
export function assertResolvedTenant(
  tenant: TenantContext | null | undefined,
): asserts tenant is TenantContext {
  if (!tenant || !tenant.schemaName || !isValidIdentifier(tenant.schemaName)) {
    throw new MissingTenantContextError(
      "Job cannot execute without a resolved tenant context.",
    );
  }
}
