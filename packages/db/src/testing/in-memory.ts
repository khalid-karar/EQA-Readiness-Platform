import { newDb } from "pg-mem";
import { type Database, registerDatabase } from "../database";
import type { Row, SqlClient } from "../sql-client";

interface MemPool {
  query(text: string, params?: readonly unknown[]): Promise<{ rows: Row[] }>;
  end?(): Promise<void>;
}

/**
 * Creates a Database backed by an in-memory Postgres (pg-mem). Used by tests and
 * for offline development. Not exported from the package index so pg-mem never
 * reaches production code. It runs the same schema-qualified SQL as the real
 * Postgres backend (search_path is not relied upon).
 */
export function createInMemoryDatabase(): Database {
  const mem = newDb();
  const adapter = mem.adapters.createPg();
  const pool = new adapter.Pool() as unknown as MemPool;

  const client: SqlClient = {
    async query<R extends Row = Row>(
      text: string,
      params?: readonly unknown[],
    ): Promise<{ rows: R[] }> {
      const result = await pool.query(text, params);
      return { rows: result.rows as R[] };
    },
    async end(): Promise<void> {
      await pool.end?.();
    },
  };

  return registerDatabase(client);
}
