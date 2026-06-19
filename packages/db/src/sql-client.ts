/** A row returned from the database. */
export type Row = Record<string, unknown>;

/**
 * Minimal SQL execution contract. This is the raw data client and is
 * INTERNAL to @eqa/db — it is never exported from the package's public entry
 * point, so feature code cannot run arbitrary SQL. Backends (real Postgres,
 * in-memory) implement it; the repository layer is the only consumer.
 */
export interface SqlClient {
  query<R extends Row = Row>(
    text: string,
    params?: readonly unknown[],
  ): Promise<{ rows: R[] }>;
  end(): Promise<void>;
}
