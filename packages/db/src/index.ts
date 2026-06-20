/**
 * @eqa/db
 *
 * Owns the database client and tenant-scoped data access (schema-per-tenant).
 *
 * The raw SQL client is NEVER exported here — feature code cannot run arbitrary
 * SQL. The only way to touch tenant data is via the repositories returned by
 * {@link createTenantRepositories}, which require a resolved tenant context.
 * The ESLint boundary rules ensure nothing outside this package can import the
 * internal client, and there is no entry point that leaks it.
 */

export type { Database } from "./database";
export { DbError, TenantNotFoundError } from "./errors";

export { createPgDatabase, type PgDatabaseConfig } from "./pg-backend";

export {
  createTenantSchema,
  listTenantSchemas,
  migrateShared,
  schemaIsProvisioned,
  SHARED_MIGRATIONS,
  TENANT_MIGRATIONS,
} from "./migrate";

export { TenantRegistry, type CreateTenantInput } from "./registry";

export {
  createTenantRepositories,
  type RepositoryOptions,
  type TenantRepositories,
} from "./repositories";

export {
  createEvidenceScanStatusWriter,
  createTenantJobAuditPort,
} from "./evidence-system";

export { createGapFlagSink } from "./gap-flag-system";

// Re-exported for ergonomics: the audit reader returns these types.
export type { AuditEntry, VerifyResult } from "@eqa/audit-log";

export { seedSeeraPilot, SEERA_PILOT } from "./seed";
export { seedSeeraPilotDemoData } from "./seed-demo-data";
