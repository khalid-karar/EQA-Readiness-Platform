import { isValidIdentifier, SHARED_SCHEMA } from "@eqa/tenant";
import { clientFor, type Database } from "./database";
import { DbError } from "./errors";
import type { Row } from "./sql-client";

/**
 * Migrations are tracked in a per-schema ledger so each schema (the shared
 * `platform` schema and every `tenant_*` schema) is provisioned exactly once.
 * Identifiers are interpolated only after validation, since SQL cannot
 * parameterize schema/table names.
 */

interface SharedMigration {
  readonly id: string;
  readonly statements: readonly string[];
}

interface TenantMigration {
  readonly id: string;
  readonly statements: (schema: string) => readonly string[];
}

const LEDGER = `${SHARED_SCHEMA}.schema_migrations`;

// Tracks which Database handles have had the ledger ensured this process, so we
// never issue a redundant `CREATE TABLE IF NOT EXISTS` for it. (Real Postgres
// tolerates the no-op; the in-memory test backend does not.)
const ledgerReady = new WeakSet<Database>();

/** Migrations applied to the shared `platform` schema. */
export const SHARED_MIGRATIONS: readonly SharedMigration[] = [
  {
    id: "0001_tenant_registry",
    statements: [
      `CREATE TABLE IF NOT EXISTS ${SHARED_SCHEMA}.tenants (
        id uuid PRIMARY KEY,
        slug text UNIQUE NOT NULL,
        name text NOT NULL,
        schema_name text UNIQUE NOT NULL,
        data_key_ciphertext text NOT NULL,
        data_key_master_id text NOT NULL,
        status text NOT NULL DEFAULT 'active',
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
    ],
  },
];

/** Migrations applied to every tenant schema. */
export const TENANT_MIGRATIONS: readonly TenantMigration[] = [
  {
    id: "0001_tenant_kv",
    statements: (schema) => [
      // Generic tenant-scoped storage used to prove the repository layer and
      // cross-tenant isolation. Not a business entity.
      `CREATE TABLE IF NOT EXISTS "${schema}".tenant_kv (
        key text PRIMARY KEY,
        value text NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
    ],
  },
  {
    id: "0002_tenant_settings",
    statements: (schema) => [
      // Tenant administration store; writes require the MANAGE permission
      // (CAE only). Infrastructure plumbing, not a business entity.
      `CREATE TABLE IF NOT EXISTS "${schema}".tenant_settings (
        key text PRIMARY KEY,
        value text NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
    ],
  },
  {
    id: "0003_audit_log",
    statements: (schema) => [
      // Append-only, hash-chained audit log. seq is the per-tenant chain
      // position. occurred_at is stored as text (the exact ISO string that is
      // hashed) so re-reads reproduce the hash exactly.
      `CREATE TABLE IF NOT EXISTS "${schema}".audit_log (
        seq integer PRIMARY KEY,
        id text NOT NULL,
        occurred_at text NOT NULL,
        actor_user_id text NOT NULL,
        actor_role text NOT NULL,
        action text NOT NULL,
        entity text NOT NULL,
        entity_id text NOT NULL,
        old_value text,
        new_value text,
        prev_hash text NOT NULL,
        entry_hash text NOT NULL
      )`,
    ],
  },
  {
    id: "0004_tenant_secure_fields",
    statements: (schema) => [
      // Sensitive fields stored encrypted at rest with the per-tenant data key.
      `CREATE TABLE IF NOT EXISTS "${schema}".tenant_secure_fields (
        key text PRIMARY KEY,
        ciphertext text NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
    ],
  },
  {
    id: "0005_assessment_responses",
    statements: (schema) => [
      // Questionnaire responses, one current row per (assessment, question).
      // Each response records the content pin (pack id + version + content hash)
      // it was answered against, so an answer is permanently tied to the exact
      // content version that produced it. A surrogate key keeps the upsert simple
      // and portable.
      `CREATE TABLE IF NOT EXISTS "${schema}".assessment_responses (
        response_key text PRIMARY KEY,
        assessment_id text NOT NULL,
        question_id text NOT NULL,
        answer text NOT NULL,
        note text,
        content_pack_id text NOT NULL,
        content_version text NOT NULL,
        content_hash text NOT NULL,
        responded_by text NOT NULL,
        responded_at text NOT NULL
      )`,
    ],
  },
  {
    id: "0006_evidence",
    statements: (schema) => [
      // Evidence file metadata, one row per (evidence_id, version). The encrypted
      // bytes live in the object store (keyed by object_key); this table never
      // holds plaintext file content. scan_status gates downloadability: a file
      // is 'quarantined' on upload and only 'clean' after the malware-scan job
      // succeeds. links is a JSON array of standard/question ids.
      `CREATE TABLE IF NOT EXISTS "${schema}".evidence (
        evidence_id text NOT NULL,
        version integer NOT NULL,
        version_hash text NOT NULL,
        content_hash text NOT NULL,
        file_name text NOT NULL,
        content_type text NOT NULL,
        size_bytes integer NOT NULL,
        links text NOT NULL,
        scan_status text NOT NULL DEFAULT 'quarantined',
        scanner text,
        object_key text NOT NULL,
        uploaded_by text NOT NULL,
        uploaded_at text NOT NULL,
        PRIMARY KEY (evidence_id, version)
      )`,
    ],
  },
  {
    id: "0007_assessment_item_status",
    statements: (schema) => [
      // The current status of each assessment item (one standard/question),
      // one row per (assessment, question). Status moves are validated against
      // the @eqa/workflows state machine and audited as status_change entries,
      // so the audit log holds the full state history; this table holds only the
      // latest status. A surrogate key keeps the upsert simple and portable.
      `CREATE TABLE IF NOT EXISTS "${schema}".assessment_item_status (
        status_key text PRIMARY KEY,
        assessment_id text NOT NULL,
        question_id text NOT NULL,
        status text NOT NULL,
        updated_by text NOT NULL,
        updated_at text NOT NULL
      )`,
    ],
  },
  {
    id: "0008_draft_findings",
    statements: (schema) => [
      // AI-drafted gap findings, one row per produced draft. A draft is work
      // product only (rule 12): the row stores the model output, the prompt and
      // rubric versions, the model adapter + location, the redacted input
      // summary, and the content pin (pack id + version + hash) so the finding is
      // permanently tied to the exact rubric version that produced it. status is
      // always 'draft' here — a draft becomes a final conclusion only through the
      // Step 11 human-review workflow, never by mutating this row.
      `CREATE TABLE IF NOT EXISTS "${schema}".draft_findings (
        finding_id text PRIMARY KEY,
        assessment_id text NOT NULL,
        question_id text NOT NULL,
        standard_number text NOT NULL,
        draft_summary text NOT NULL,
        status text NOT NULL DEFAULT 'draft',
        prompt_version text NOT NULL,
        rubric_version text NOT NULL,
        model_adapter text NOT NULL,
        adapter_location text NOT NULL,
        input_summary text NOT NULL,
        content_pack_id text NOT NULL,
        content_version text NOT NULL,
        content_hash text NOT NULL,
        created_by text NOT NULL,
        created_at text NOT NULL
      )`,
    ],
  },
  {
    id: "0009_human_review",
    statements: (schema) => [
      // Human review decisions — the full decision trail for every reviewer
      // action (accept, reject, edit_accept). Records the original AI draft, any
      // edits, provenance (prompt/rubric version + adapter), and content pin so
      // AI draft → human decision → final state is reconstructable from the log.
      // reviewed_at on draft_findings is set when a decision is recorded.
      `CREATE TABLE IF NOT EXISTS "${schema}".human_review_decisions (
        decision_id text PRIMARY KEY,
        finding_id text NOT NULL UNIQUE,
        assessment_id text NOT NULL,
        question_id text NOT NULL,
        standard_number text NOT NULL,
        review_action text NOT NULL,
        original_draft_summary text NOT NULL,
        edited_text text,
        prompt_version text NOT NULL,
        rubric_version text NOT NULL,
        model_adapter text NOT NULL,
        adapter_location text NOT NULL,
        content_pack_id text NOT NULL,
        content_version text NOT NULL,
        content_hash text NOT NULL,
        reviewed_by text NOT NULL,
        reviewed_at text NOT NULL
      )`,
      // Final conclusions — only accept / edit_accept outcomes. This is the ONLY
      // table that stores human-owned final conclusions; rows are written
      // exclusively by the human-review workflow (Step 11).
      `CREATE TABLE IF NOT EXISTS "${schema}".final_conclusions (
        conclusion_id text PRIMARY KEY,
        decision_id text NOT NULL UNIQUE,
        finding_id text NOT NULL,
        assessment_id text NOT NULL,
        question_id text NOT NULL,
        standard_number text NOT NULL,
        conclusion text NOT NULL,
        reviewed_by text NOT NULL,
        reviewed_at text NOT NULL
      )`,
      `ALTER TABLE "${schema}".draft_findings
         ADD COLUMN IF NOT EXISTS reviewed_at text`,
    ],
  },
  {
    id: "0010_working_paper_review",
    statements: (schema) => [
      // Working-paper review data model (entities only — workflow logic is Step 12).
      // Hierarchy: engagement → audit file → working paper → review checklist →
      // checklist result. Sample selections link engagements to the review sample.
      `CREATE TABLE IF NOT EXISTS "${schema}".audit_engagements (
        engagement_id text PRIMARY KEY,
        title text NOT NULL,
        period_start text NOT NULL,
        period_end text NOT NULL,
        status text NOT NULL DEFAULT 'completed',
        created_by text NOT NULL,
        created_at text NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS "${schema}".audit_files (
        file_id text PRIMARY KEY,
        engagement_id text NOT NULL,
        name text NOT NULL,
        description text,
        created_by text NOT NULL,
        created_at text NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS "${schema}".working_papers (
        working_paper_id text PRIMARY KEY,
        file_id text NOT NULL,
        reference text NOT NULL,
        title text NOT NULL,
        prepared_by text NOT NULL,
        prepared_at text NOT NULL
      )`,
      // References the Step 5 Working-Paper Review Checklist via content pin —
      // checklist item text is NOT stored here.
      `CREATE TABLE IF NOT EXISTS "${schema}".review_checklists (
        checklist_id text PRIMARY KEY,
        working_paper_id text NOT NULL,
        standard_number text NOT NULL,
        content_pack_id text NOT NULL,
        content_version text NOT NULL,
        content_hash text NOT NULL,
        created_by text NOT NULL,
        created_at text NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS "${schema}".checklist_results (
        result_id text PRIMARY KEY,
        checklist_id text NOT NULL,
        checklist_item_id text NOT NULL,
        conformance text NOT NULL,
        note text,
        recorded_by text NOT NULL,
        recorded_at text NOT NULL,
        UNIQUE (checklist_id, checklist_item_id)
      )`,
      `CREATE TABLE IF NOT EXISTS "${schema}".sample_selections (
        selection_id text PRIMARY KEY,
        engagement_id text NOT NULL,
        rationale text NOT NULL,
        selected_by text NOT NULL,
        selected_at text NOT NULL
      )`,
    ],
  },
  {
    id: "0011_remediation_tracker",
    statements: (schema) => [
      `CREATE TABLE IF NOT EXISTS "${schema}".remediation_items (
        remediation_id text PRIMARY KEY,
        assessment_id text NOT NULL,
        question_id text NOT NULL,
        standard_number text NOT NULL,
        action text NOT NULL,
        owner text NOT NULL,
        target_date text NOT NULL,
        created_by text NOT NULL,
        created_at text NOT NULL,
        updated_by text NOT NULL,
        updated_at text NOT NULL,
        closed_at text,
        retest_note text,
        UNIQUE (assessment_id, question_id)
      )`,
    ],
  },
  {
    id: "0012_mock_eqa_simulation",
    statements: (schema) => [
      `CREATE TABLE IF NOT EXISTS "${schema}".mock_eqa_simulations (
        simulation_id text PRIMARY KEY,
        assessment_id text NOT NULL,
        kind text NOT NULL DEFAULT 'readiness_simulation',
        overall_score integer NOT NULL,
        overall_level text NOT NULL,
        payload_json text NOT NULL,
        run_by text NOT NULL,
        run_at text NOT NULL,
        CHECK (kind = 'readiness_simulation')
      )`,
    ],
  },
  {
    id: "0013_evidence_pack_exports",
    statements: (schema) => [
      `CREATE TABLE IF NOT EXISTS "${schema}".evidence_pack_exports (
        export_id text PRIMARY KEY,
        assessment_id text NOT NULL,
        kind text NOT NULL DEFAULT 'readiness_evidence_pack',
        locale text NOT NULL,
        format text NOT NULL DEFAULT 'pdf',
        include_raw_evidence integer NOT NULL DEFAULT 0,
        object_key text NOT NULL,
        file_name text NOT NULL,
        size_bytes integer NOT NULL,
        manifest_json text NOT NULL,
        generated_by text NOT NULL,
        generated_at text NOT NULL,
        CHECK (kind = 'readiness_evidence_pack'),
        CHECK (include_raw_evidence IN (0, 1))
      )`,
    ],
  },
];

async function ensureLedger(db: Database): Promise<void> {
  if (ledgerReady.has(db)) return;
  const client = clientFor(db);
  await client.query(`CREATE SCHEMA IF NOT EXISTS ${SHARED_SCHEMA}`);
  await client.query(
    `CREATE TABLE IF NOT EXISTS ${LEDGER} (
      schema_name text NOT NULL,
      migration_id text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (schema_name, migration_id)
    )`,
  );
  ledgerReady.add(db);
}

async function appliedMigrations(
  db: Database,
  schema: string,
): Promise<Set<string>> {
  const { rows } = await clientFor(db).query<Row>(
    `SELECT migration_id FROM ${LEDGER} WHERE schema_name = $1`,
    [schema],
  );
  return new Set(rows.map((row) => String(row.migration_id)));
}

async function recordMigration(
  db: Database,
  schema: string,
  migrationId: string,
): Promise<void> {
  await clientFor(db).query(
    `INSERT INTO ${LEDGER} (schema_name, migration_id) VALUES ($1, $2)`,
    [schema, migrationId],
  );
}

/** Creates the shared schema and applies any pending shared migrations. */
export async function migrateShared(db: Database): Promise<void> {
  await ensureLedger(db);
  const done = await appliedMigrations(db, SHARED_SCHEMA);
  const client = clientFor(db);

  for (const migration of SHARED_MIGRATIONS) {
    if (done.has(migration.id)) continue;
    for (const statement of migration.statements) {
      await client.query(statement);
    }
    await recordMigration(db, SHARED_SCHEMA, migration.id);
  }
}

/**
 * Creates a tenant schema (if needed) and applies any pending tenant
 * migrations to it. This is the tooling used to onboard a new tenant.
 */
export async function createTenantSchema(
  db: Database,
  schema: string,
): Promise<void> {
  if (!isValidIdentifier(schema)) {
    throw new DbError(`Refusing to create invalid schema name '${schema}'.`);
  }
  await ensureLedger(db);
  const client = clientFor(db);
  await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);

  const done = await appliedMigrations(db, schema);
  for (const migration of TENANT_MIGRATIONS) {
    if (done.has(migration.id)) continue;
    for (const statement of migration.statements(schema)) {
      await client.query(statement);
    }
    await recordMigration(db, schema, migration.id);
  }
}

/** True when a tenant schema has all tenant migrations applied. */
export async function schemaIsProvisioned(
  db: Database,
  schema: string,
): Promise<boolean> {
  const done = await appliedMigrations(db, schema);
  return TENANT_MIGRATIONS.every((migration) => done.has(migration.id));
}

/** Lists provisioned tenant schemas (those with at least one migration). */
export async function listTenantSchemas(db: Database): Promise<string[]> {
  const { rows } = await clientFor(db).query<Row>(
    `SELECT DISTINCT schema_name FROM ${LEDGER} WHERE schema_name LIKE 'tenant_%' ORDER BY schema_name`,
  );
  return rows.map((row) => String(row.schema_name));
}
