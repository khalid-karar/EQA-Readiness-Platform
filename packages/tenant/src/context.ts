import { MissingTenantContextError } from "./errors";

/**
 * The resolved identity of the tenant a request operates on. Every tenant-scoped
 * data operation requires one of these; it cannot be forged by feature code
 * because it is only produced by tenant resolution against the registry.
 */
export interface TenantContext {
  readonly tenantId: string;
  readonly slug: string;
  readonly name: string;
  /** The Postgres schema that holds this tenant's data. */
  readonly schemaName: string;
}

/**
 * Narrows a possibly-absent context to a definite one, throwing if missing.
 * Use at the boundary where feature code requires tenant scope.
 */
export function requireTenant(
  context: TenantContext | null | undefined,
): TenantContext {
  if (!context) {
    throw new MissingTenantContextError();
  }
  return context;
}
