/** The shared (cross-tenant) schema that holds the tenant registry. */
export const SHARED_SCHEMA = "platform";

const TENANT_SCHEMA_PREFIX = "tenant_";
const MAX_IDENTIFIER_LENGTH = 63; // PostgreSQL identifier limit.
const VALID_IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

/**
 * Validates a string is safe to interpolate as a SQL identifier (schema/table
 * name). Identifiers cannot be parameterized in SQL, so anything interpolated
 * must pass this check first.
 */
export function isValidIdentifier(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= MAX_IDENTIFIER_LENGTH &&
    VALID_IDENTIFIER.test(value)
  );
}

/**
 * Derives a deterministic, collision-resistant schema name from a tenant slug.
 * e.g. `seera-pilot` -> `tenant_seera_pilot`.
 */
export function tenantSchemaName(slug: string): string {
  const normalized = slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const schema = `${TENANT_SCHEMA_PREFIX}${normalized}`;
  if (!normalized || !isValidIdentifier(schema)) {
    throw new Error(`Cannot derive a valid schema name from slug '${slug}'.`);
  }
  return schema;
}
