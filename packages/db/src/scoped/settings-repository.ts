import { type AuthSession, authorize, PERMISSIONS } from "@eqa/auth";
import type { Row } from "../sql-client";
import { AuditedRepository } from "./audited-repository";
import type { ScopedExecutor } from "./scoped-executor";

interface SettingRow extends Row {
  key: string;
  value: string;
}

/**
 * Tenant administration store. Reads require READ; writes require MANAGE (CAE
 * only). Demonstrates that Audit Staff (operational write) still cannot perform
 * administrative writes. Enforced in the data layer; writes are audited
 * automatically via {@link recordWrite}.
 */
export class TenantSettingsRepository extends AuditedRepository {
  constructor(exec: ScopedExecutor, session: AuthSession) {
    super(exec, session);
  }

  async set(key: string, value: string): Promise<void> {
    authorize(this.session, PERMISSIONS.MANAGE);
    await this.recordWrite({
      entity: "tenant_settings",
      entityId: key,
      readValue: () => this.readRaw(key),
      write: () => this.writeRaw(key, value),
    });
  }

  async get(key: string): Promise<string | null> {
    authorize(this.session, PERMISSIONS.READ);
    return this.readRaw(key);
  }

  private async readRaw(key: string): Promise<string | null> {
    const rows = await this.exec.query<SettingRow>(
      `SELECT key, value FROM ${this.exec.table("tenant_settings")} WHERE key = $1`,
      [key],
    );
    const row = rows[0];
    return row ? row.value : null;
  }

  private async writeRaw(key: string, value: string): Promise<void> {
    await this.exec.query(
      `INSERT INTO ${this.exec.table("tenant_settings")} (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [key, value],
    );
  }
}
