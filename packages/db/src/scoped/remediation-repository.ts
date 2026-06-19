import { randomUUID } from "node:crypto";
import { type AuthSession, authorize, PERMISSIONS } from "@eqa/auth";
import {
  IllegalRemediationStateError,
  RemediationAlreadyExistsError,
  RemediationNotFoundError,
  resolveAssignRemediation,
  resolveReadyForRetest,
  resolveRetestFail,
  resolveRetestPass,
  type AssignRemediationInput,
  type ItemStatus,
  type RemediationItem,
  type RemediationStore,
  type RemediationTransition,
  type UpdateRemediationInput,
} from "@eqa/workflows";
import type { Row } from "../sql-client";
import { AuditedRepository } from "./audited-repository";
import { TenantItemStatusRepository } from "./item-status-repository";
import type { ScopedExecutor } from "./scoped-executor";

interface RemediationRow extends Row {
  remediation_id: string;
  assessment_id: string;
  question_id: string;
  standard_number: string;
  action: string;
  owner: string;
  target_date: string;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  closed_at: string | null;
  retest_note: string | null;
}

function toRemediationItem(row: RemediationRow): RemediationItem {
  return {
    remediationId: row.remediation_id,
    assessmentId: row.assessment_id,
    questionId: row.question_id,
    standardNumber: row.standard_number,
    action: row.action,
    owner: row.owner,
    targetDate: row.target_date,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
    closedAt: row.closed_at,
    retestNote: row.retest_note,
  };
}

/**
 * Tenant-scoped remediation tracker. Implements {@link RemediationStore} and
 * coordinates item status transitions through the state machine. WRITE required
 * for mutations (CAE and Audit Staff); Board is read-only.
 */
export class TenantRemediationRepository
  extends AuditedRepository
  implements RemediationStore
{
  private readonly itemStatus: TenantItemStatusRepository;

  constructor(exec: ScopedExecutor, session: AuthSession) {
    super(exec, session);
    this.itemStatus = new TenantItemStatusRepository(exec, session);
  }

  async assign(input: AssignRemediationInput): Promise<RemediationItem> {
    authorize(this.session, PERMISSIONS.WRITE);

    const existing = await this.findByQuestion(
      input.assessmentId,
      input.questionId,
    );
    if (existing) {
      throw new RemediationAlreadyExistsError(
        `Remediation already exists for '${input.assessmentId}::${input.questionId}'.`,
      );
    }

    const current = await this.itemStatus.getStatus(
      input.assessmentId,
      input.questionId,
    );
    const fromStatus = current?.status ?? "not_assessed";
    const transition = resolveAssignRemediation(fromStatus);
    await this.itemStatus.transition({
      assessmentId: input.assessmentId,
      questionId: input.questionId,
      to: transition.to,
    });

    const remediationId = randomUUID();
    const now = new Date().toISOString();
    return this.recordWrite<RemediationItem>({
      entity: "remediation_item",
      entityId: remediationId,
      readValue: async () => null,
      write: async () => {
        await this.exec.query(
          `INSERT INTO ${this.exec.table("remediation_items")}
             (remediation_id, assessment_id, question_id, standard_number,
              action, owner, target_date, created_by, created_at,
              updated_by, updated_at, closed_at, retest_note)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            remediationId,
            input.assessmentId,
            input.questionId,
            input.standardNumber,
            input.action,
            input.owner,
            input.targetDate,
            this.session.userId,
            now,
            this.session.userId,
            now,
            null,
            null,
          ],
        );
        const row = await this.readById(remediationId);
        if (!row) {
          throw new RemediationNotFoundError(
            `Remediation '${remediationId}' was not persisted.`,
          );
        }
        return toRemediationItem(row);
      },
    });
  }

  async updatePlan(input: UpdateRemediationInput): Promise<RemediationItem> {
    authorize(this.session, PERMISSIONS.WRITE);
    const existing = await this.readById(input.remediationId);
    if (!existing) {
      throw new RemediationNotFoundError(
        `No remediation '${input.remediationId}' in this tenant.`,
      );
    }

    const current = await this.itemStatus.getStatus(
      existing.assessment_id,
      existing.question_id,
    );
    if (current?.status !== "remediation_in_progress") {
      throw new IllegalRemediationStateError(
        `Remediation plan can only be updated while 'remediation_in_progress'; ` +
          `got '${current?.status ?? "not_assessed"}'.`,
      );
    }

    const now = new Date().toISOString();
    return this.recordWrite<RemediationItem>({
      entity: "remediation_item",
      entityId: input.remediationId,
      readValue: () => this.readItem(input.remediationId),
      write: async () => {
        await this.exec.query(
          `UPDATE ${this.exec.table("remediation_items")}
              SET action = COALESCE($1, action),
                  owner = COALESCE($2, owner),
                  target_date = COALESCE($3, target_date),
                  updated_by = $4,
                  updated_at = $5
            WHERE remediation_id = $6`,
          [
            input.action ?? null,
            input.owner ?? null,
            input.targetDate ?? null,
            this.session.userId,
            now,
            input.remediationId,
          ],
        );
        const row = await this.readById(input.remediationId);
        if (!row) {
          throw new RemediationNotFoundError(
            `Remediation '${input.remediationId}' missing after update.`,
          );
        }
        return toRemediationItem(row);
      },
    });
  }

  async markReadyForRetest(remediationId: string): Promise<RemediationItem> {
    return this.transitionRemediation(
      remediationId,
      resolveReadyForRetest,
      async () => undefined,
    );
  }

  async recordRetestPass(remediationId: string): Promise<RemediationItem> {
    return this.transitionRemediation(
      remediationId,
      resolveRetestPass,
      async () => {
        const now = new Date().toISOString();
        await this.exec.query(
          `UPDATE ${this.exec.table("remediation_items")}
              SET closed_at = $1, updated_by = $2, updated_at = $3
            WHERE remediation_id = $4`,
          [now, this.session.userId, now, remediationId],
        );
      },
    );
  }

  async recordRetestFail(
    remediationId: string,
    note?: string,
  ): Promise<RemediationItem> {
    return this.transitionRemediation(
      remediationId,
      resolveRetestFail,
      async () => {
        const now = new Date().toISOString();
        await this.exec.query(
          `UPDATE ${this.exec.table("remediation_items")}
              SET retest_note = $1, updated_by = $2, updated_at = $3
            WHERE remediation_id = $4`,
          [note ?? null, this.session.userId, now, remediationId],
        );
      },
    );
  }

  async getById(remediationId: string): Promise<RemediationItem | null> {
    authorize(this.session, PERMISSIONS.READ);
    const row = await this.readById(remediationId);
    return row ? toRemediationItem(row) : null;
  }

  async listForAssessment(assessmentId: string): Promise<RemediationItem[]> {
    authorize(this.session, PERMISSIONS.READ);
    const rows = await this.exec.query<RemediationRow>(
      `SELECT remediation_id, assessment_id, question_id, standard_number,
              action, owner, target_date, created_by, created_at,
              updated_by, updated_at, closed_at, retest_note
         FROM ${this.exec.table("remediation_items")}
        WHERE assessment_id = $1
        ORDER BY target_date, remediation_id`,
      [assessmentId],
    );
    return rows.map(toRemediationItem);
  }

  private async transitionRemediation(
    remediationId: string,
    resolver: (status: ItemStatus) => RemediationTransition,
    afterTransition: () => Promise<void>,
  ): Promise<RemediationItem> {
    authorize(this.session, PERMISSIONS.WRITE);
    const existing = await this.readById(remediationId);
    if (!existing) {
      throw new RemediationNotFoundError(
        `No remediation '${remediationId}' in this tenant.`,
      );
    }

    const current = await this.itemStatus.getStatus(
      existing.assessment_id,
      existing.question_id,
    );
    const fromStatus = current?.status ?? "not_assessed";
    const transition = resolver(fromStatus);
    await this.itemStatus.transition({
      assessmentId: existing.assessment_id,
      questionId: existing.question_id,
      to: transition.to,
    });
    await afterTransition();

    const row = await this.readById(remediationId);
    if (!row) {
      throw new RemediationNotFoundError(
        `Remediation '${remediationId}' missing after transition.`,
      );
    }
    return toRemediationItem(row);
  }

  private async readItem(
    remediationId: string,
  ): Promise<RemediationItem | null> {
    const row = await this.readById(remediationId);
    return row ? toRemediationItem(row) : null;
  }

  private async readById(
    remediationId: string,
  ): Promise<RemediationRow | null> {
    const rows = await this.exec.query<RemediationRow>(
      `SELECT remediation_id, assessment_id, question_id, standard_number,
              action, owner, target_date, created_by, created_at,
              updated_by, updated_at, closed_at, retest_note
         FROM ${this.exec.table("remediation_items")}
        WHERE remediation_id = $1`,
      [remediationId],
    );
    return rows[0] ?? null;
  }

  private async findByQuestion(
    assessmentId: string,
    questionId: string,
  ): Promise<RemediationRow | null> {
    const rows = await this.exec.query<RemediationRow>(
      `SELECT remediation_id, assessment_id, question_id, standard_number,
              action, owner, target_date, created_by, created_at,
              updated_by, updated_at, closed_at, retest_note
         FROM ${this.exec.table("remediation_items")}
        WHERE assessment_id = $1 AND question_id = $2`,
      [assessmentId, questionId],
    );
    return rows[0] ?? null;
  }
}
