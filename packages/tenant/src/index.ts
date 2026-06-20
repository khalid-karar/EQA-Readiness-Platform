/**
 * @eqa/tenant
 *
 * Tenant identity and request-level resolution. Multi-tenant, schema-per-tenant
 * from day one. Defines the tenant context every data operation requires, the
 * explicit allowlist of routes that run without a tenant, and the resolver that
 * ties them together. The data layer (@eqa/db) implements the TenantDirectory
 * port, so this package has no dependency on the database.
 */

export type { TenantContext } from "./context";
export { requireTenant } from "./context";
export type { TenantDescriptor, TenantDirectory } from "./directory";
export {
  MissingTenantContextError,
  TenantError,
  TenantNotResolvedError,
} from "./errors";
export { isPublicRoute, PUBLIC_ROUTE_PATTERNS } from "./public-routes";
export {
  resolveTenantContext,
  type ResolveInput,
  type TenantResolution,
} from "./resolve";
export {
  createAllowlistTenantDirectory,
  createAllowlistTenantDirectoryFromSlugs,
} from "./allowlist-directory";
export { isValidIdentifier, SHARED_SCHEMA, tenantSchemaName } from "./schema";
