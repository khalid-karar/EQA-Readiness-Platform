import { DbError } from "./errors";
import type { SqlClient } from "./sql-client";

/**
 * Opaque database handle passed to migration tooling, the tenant registry, and
 * the repository layer. It intentionally exposes no `query` method: the
 * underlying {@link SqlClient} is held privately so feature code can never run
 * raw SQL against it. The only way to read/write data is through the
 * tenant-scoped repositories created from a resolved tenant context.
 */
export interface Database {
  /** Closes the underlying connection/pool. */
  close(): Promise<void>;
}

// Maps a public handle to its private client. Using a WeakMap (rather than a
// field) keeps the client unreachable from the handle itself.
const clients = new WeakMap<Database, SqlClient>();

/** Wraps a {@link SqlClient} into an opaque {@link Database} handle. */
export function registerDatabase(client: SqlClient): Database {
  const handle: Database = {
    close: () => client.end(),
  };
  clients.set(handle, client);
  return handle;
}

/**
 * Internal accessor for the private client behind a handle. Not exported from
 * the package index — only the in-package data layer may use it.
 */
export function clientFor(db: Database): SqlClient {
  const client = clients.get(db);
  if (!client) {
    throw new DbError("Unrecognized Database handle.");
  }
  return client;
}
