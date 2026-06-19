import pg from "pg";
import { type Database, registerDatabase } from "./database";
import type { Row, SqlClient } from "./sql-client";

export interface PgDatabaseConfig {
  /** Postgres connection string (e.g. from DATABASE_URL). */
  readonly connectionString: string;
  /** Optional max pool size. */
  readonly max?: number;
}

/**
 * Creates a Database backed by a real Postgres connection pool. The pool is the
 * raw client and stays private inside the returned handle.
 */
export function createPgDatabase(config: PgDatabaseConfig): Database {
  const pool = new pg.Pool({
    connectionString: config.connectionString,
    ...(config.max === undefined ? {} : { max: config.max }),
  });

  const client: SqlClient = {
    async query<R extends Row = Row>(
      text: string,
      params?: readonly unknown[],
    ): Promise<{ rows: R[] }> {
      const result = await pool.query<R>(text, params as unknown[] | undefined);
      return { rows: result.rows };
    },
    end: () => pool.end(),
  };

  return registerDatabase(client);
}
