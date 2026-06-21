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

export {
  createEvidenceJobHandlers,
  createEvidenceServiceForSession,
  type EvidenceJobHandlerDeps,
  type EvidenceRuntimeDeps,
} from "./evidence-wiring";

export { createReportJobHandlers } from "./report-wiring";

export { createGapFlagSink } from "./gap-flag-system";

// Re-exported for ergonomics: the audit reader returns these types.
export type { AuditEntry, VerifyResult } from "@eqa/audit-log";

export { seedBetaCo, seedSeeraPilot, BETA_CO, SEERA_PILOT } from "./seed";
export { seedBetaCoDemoData, seedSeeraPilotDemoData } from "./seed-demo-data";

export {
  assertUiSession,
  uiRepositories,
  PILOT_ASSESSMENT_ID,
  PILOT_ASSESSMENT_NAME,
  PILOT_PACK_ID,
  PILOT_PACK_VERSION,
  loadMockEqaScoringInput,
  loadFinalConclusions,
  createDashboardLoader,
  loadDashboardView,
  createAssessmentLoader,
  createFindingsLoader,
  createEvidenceLoader,
  createRemediationLoader,
  createWorkingPapersLoader,
  createEngagementsLoader,
  createMockEqaLoader,
  createEvidencePackLoader,
  type DashboardLoader,
  type AssessmentLoader,
  type AssessmentLoadResult,
  type FindingsLoader,
  type FindingsLoadResult,
  type EvidenceLoader,
  type EvidenceLoadResult,
  type RemediationLoader,
  type WorkingPapersLoader,
  type WorkingPapersLoadResult,
  type WorkingPapersEngagementLoad,
  type EngagementsLoader,
  type EngagementsLoadResult,
  type EngagementOverviewLoad,
  type EngagementWorkingPaperSummary,
  type MockEqaLoader,
  type MockEqaLoadResult,
  type EvidencePackLoader,
  type EvidencePackLoadResult,
} from "./ui-loaders";

export { createUiActionHandlers } from "./ui-action-system";
