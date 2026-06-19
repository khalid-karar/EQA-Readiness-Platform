import { type AuthSession, authorize, PERMISSIONS } from "@eqa/auth";
import type { Row } from "../sql-client";
import { AuditedRepository } from "./audited-repository";
import type { ScopedExecutor } from "./scoped-executor";

interface KvRow extends Row {
  key: string;
  value: string;
}

/**
 * Generic tenant-scoped key/value store (operational data). Infrastructure
 * plumbing used to demonstrate tenant isolation, RBAC, AND automatic audit
 * logging — not a business entity. Reads require READ; writes require WRITE.
 * Writes are routed through {@link recordWrite}, so each one produces an audit
 * entry without this repository implementing audit logic itself.
 */
export class TenantKvRepository extends AuditedRepository {
  constructor(exec: ScopedExecutor, session: AuthSession) {
    super(exec, session);
  }

  async set(key: string, value: string): Promise<void> {
    authorize(this.session, PERMISSIONS.WRITE);
    await this.recordWrite({
      entity: "tenant_kv",
      entityId: key,
      readValue: () => this.readRaw(key),
      write: () => this.writeRaw(key, value),
    });
  }

  async get(key: string): Promise<string | null> {
    authorize(this.session, PERMISSIONS.READ);
    return this.readRaw(key);
  }

  async all(): Promise<KvRow[]> {
    authorize(this.session, PERMISSIONS.READ);
    return this.exec.query<KvRow>(
      `SELECT key, value FROM ${this.exec.table("tenant_kv")} ORDER BY key`,
    );
  }

  private async readRaw(key: string): Promise<string | null> {
    const rows = await this.exec.query<KvRow>(
      `SELECT key, value FROM ${this.exec.table("tenant_kv")} WHERE key = $1`,
      [key],
    );
    const row = rows[0];
    return row ? row.value : null;
  }

  private async writeRaw(key: string, value: string): Promise<void> {
    await this.exec.query(
      `INSERT INTO ${this.exec.table("tenant_kv")} (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [key, value],
    );
  }
}
