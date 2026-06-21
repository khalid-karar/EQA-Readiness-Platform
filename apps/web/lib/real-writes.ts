import { isDemoFixturesEnabled } from "./demo-fixtures";
import { isDatabaseConfigured } from "./db";

/** Postgres-backed mutations via jobs — off when demo fixtures or no DATABASE_URL. */
export function isRealWritesEnabled(): boolean {
  return isDatabaseConfigured() && !isDemoFixturesEnabled();
}
