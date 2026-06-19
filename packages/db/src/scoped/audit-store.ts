import type { AuditAction, AuditEntry, AuditStore } from "@eqa/audit-log";
import type { Row } from "../sql-client";
import type { ScopedExecutor } from "./scoped-executor";

interface AuditRow extends Row {
  seq: number;
  id: string;
  occurred_at: string;
  actor_user_id: string;
  actor_role: string;
  action: string;
  entity: string;
  entity_id: string;
  old_value: string | null;
  new_value: string | null;
  prev_hash: string;
  entry_hash: string;
}

function toEntry(row: AuditRow): AuditEntry {
  return {
    seq: row.seq,
    id: row.id,
    occurredAt: row.occurred_at,
    actorUserId: row.actor_user_id,
    actorRole: row.actor_role,
    action: row.action as AuditAction,
    entity: row.entity,
    entityId: row.entity_id,
    oldValue: row.old_value,
    newValue: row.new_value,
    prevHash: row.prev_hash,
    entryHash: row.entry_hash,
  };
}

const COLUMNS =
  "seq, id, occurred_at, actor_user_id, actor_role, action, entity, entity_id, old_value, new_value, prev_hash, entry_hash";

/**
 * Tenant-scoped persistence for the audit log. Backed by the acting tenant's
 * `audit_log` table via {@link ScopedExecutor}, so audit entries are themselves
 * tenant-isolated. Exposes append/read only — there is no update or delete, so
 * entries cannot be edited or removed through the application.
 */
export class TenantAuditStore implements AuditStore {
  constructor(private readonly exec: ScopedExecutor) {}

  async lastRow(): Promise<AuditEntry | null> {
    const rows = await this.exec.query<AuditRow>(
      `SELECT ${COLUMNS} FROM ${this.exec.table("audit_log")} ORDER BY seq DESC LIMIT 1`,
    );
    const row = rows[0];
    return row ? toEntry(row) : null;
  }

  async listRows(): Promise<AuditEntry[]> {
    const rows = await this.exec.query<AuditRow>(
      `SELECT ${COLUMNS} FROM ${this.exec.table("audit_log")} ORDER BY seq ASC`,
    );
    return rows.map(toEntry);
  }

  async appendRow(entry: AuditEntry): Promise<void> {
    await this.exec.query(
      `INSERT INTO ${this.exec.table("audit_log")}
         (${COLUMNS})
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        entry.seq,
        entry.id,
        entry.occurredAt,
        entry.actorUserId,
        entry.actorRole,
        entry.action,
        entry.entity,
        entry.entityId,
        entry.oldValue,
        entry.newValue,
        entry.prevHash,
        entry.entryHash,
      ],
    );
  }
}
