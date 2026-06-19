import { type AuthSession, authorize, PERMISSIONS } from "@eqa/auth";
import {
  assertTransition,
  INITIAL_ITEM_STATUS,
  type ItemStatus,
  type ItemStatusRecord,
  type ItemStatusStore,
  type ItemStatusTransitionInput,
} from "@eqa/workflows";
import type { Row } from "../sql-client";
import { AuditedRepository } from "./audited-repository";
import type { ScopedExecutor } from "./scoped-executor";

interface ItemStatusRow extends Row {
  assessment_id: string;
  question_id: string;
  status: string;
  updated_by: string;
  updated_at: string;
}

function statusKey(assessmentId: string, questionId: string): string {
  return `${assessmentId}::${questionId}`;
}

function toRecord(row: ItemStatusRow): ItemStatusRecord {
  return {
    assessmentId: row.assessment_id,
    questionId: row.question_id,
    status: row.status as ItemStatus,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

/**
 * Tenant-scoped store for assessment item status. Implements the workflow
 * engine's {@link ItemStatusStore} port. Transitions require the WRITE
 * permission (CAE and Audit Staff; Board/Audit Committee is read-only and cannot
 * move anything), are validated against the pure {@link assertTransition} rules
 * BEFORE any write — so an illegal transition is rejected at the data layer and
 * never persists — and are audited automatically via {@link AuditedRepository}
 * as `status_change` entries. Because every move is logged with its old and new
 * status, the full state history of an item is reconstructable from the log.
 */
export class TenantItemStatusRepository
  extends AuditedRepository
  implements ItemStatusStore
{
  constructor(exec: ScopedExecutor, session: AuthSession) {
    super(exec, session);
  }

  async getStatus(
    assessmentId: string,
    questionId: string,
  ): Promise<ItemStatusRecord | null> {
    authorize(this.session, PERMISSIONS.READ);
    return this.readRaw(statusKey(assessmentId, questionId));
  }

  async getForAssessment(assessmentId: string): Promise<ItemStatusRecord[]> {
    authorize(this.session, PERMISSIONS.READ);
    const rows = await this.exec.query<ItemStatusRow>(
      `SELECT assessment_id, question_id, status, updated_by, updated_at
         FROM ${this.exec.table("assessment_item_status")}
        WHERE assessment_id = $1
        ORDER BY question_id`,
      [assessmentId],
    );
    return rows.map(toRecord);
  }

  async transition(
    input: ItemStatusTransitionInput,
  ): Promise<ItemStatusRecord> {
    authorize(this.session, PERMISSIONS.WRITE);
    const key = statusKey(input.assessmentId, input.questionId);
    const current = await this.readRaw(key);
    const from = current?.status ?? INITIAL_ITEM_STATUS;
    // The data-layer gate: an illegal transition throws before anything is
    // written, so it can never be persisted by bypassing the UI.
    assertTransition(from, input.to);
    return this.recordWrite<ItemStatusRecord>({
      entity: "assessment_item_status",
      entityId: key,
      action: "status_change",
      readValue: () => this.readStatus(key),
      write: () => this.writeRaw(key, input),
    });
  }

  /** Effective status used for audit before/after (synthesises the initial state). */
  private async readStatus(key: string): Promise<ItemStatus> {
    const row = await this.readRaw(key);
    return row?.status ?? INITIAL_ITEM_STATUS;
  }

  private async readRaw(key: string): Promise<ItemStatusRecord | null> {
    const rows = await this.exec.query<ItemStatusRow>(
      `SELECT assessment_id, question_id, status, updated_by, updated_at
         FROM ${this.exec.table("assessment_item_status")}
        WHERE status_key = $1`,
      [key],
    );
    const row = rows[0];
    return row ? toRecord(row) : null;
  }

  private async writeRaw(
    key: string,
    input: ItemStatusTransitionInput,
  ): Promise<ItemStatusRecord> {
    const updatedAt = new Date().toISOString();
    await this.exec.query(
      `INSERT INTO ${this.exec.table("assessment_item_status")}
         (status_key, assessment_id, question_id, status, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (status_key) DO UPDATE SET
         status = EXCLUDED.status,
         updated_by = EXCLUDED.updated_by,
         updated_at = EXCLUDED.updated_at`,
      [
        key,
        input.assessmentId,
        input.questionId,
        input.to,
        this.session.userId,
        updatedAt,
      ],
    );
    return {
      assessmentId: input.assessmentId,
      questionId: input.questionId,
      status: input.to,
      updatedBy: this.session.userId,
      updatedAt,
    };
  }
}
