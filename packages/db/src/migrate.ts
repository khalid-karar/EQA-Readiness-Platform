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
