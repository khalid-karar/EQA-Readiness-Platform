import { createPgDatabase, type Database } from "@eqa/db";

let cached: Database | undefined;

/** Singleton Postgres handle for server-side UI loaders. */
export function getAppDatabase(): Database {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is required for tenant-scoped UI reads from Postgres.",
    );
  }
  if (!cached) {
    cached = createPgDatabase({ connectionString });
  }
  return cached;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
