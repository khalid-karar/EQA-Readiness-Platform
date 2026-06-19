import { randomUUID } from "node:crypto";
import { type AuthSession, authorize, PERMISSIONS } from "@eqa/auth";
import {
  DraftAlreadyReviewedError,
  DraftFindingNotFoundError,
  IllegalReviewStateError,
  resolveHumanReview,
  type FinalConclusion,
  type FinalConclusionReader,
  type HumanReviewInput,
  type HumanReviewResult,
  type HumanReviewStore,
  type ItemStatus,
} from "@eqa/workflows";
import type { Row } from "../sql-client";
import { AuditedRepository } from "./audited-repository";
import { TenantDraftFindingRepository } from "./draft-finding-repository";
import { TenantItemStatusRepository } from "./item-status-repository";
import type { ScopedExecutor } from "./scoped-executor";

interface ReviewedRow extends Row {
  reviewed_at: string | null;
}

interface FinalConclusionRow extends Row {
  assessment_id: string;
  question_id: string;
  standard_number: string;
  conclusion: string;
}

function toFinalConclusion(row: FinalConclusionRow): FinalConclusion {
  return {
    kind: "final_conclusion",
    assessmentId: row.assessment_id,
    questionId: row.question_id,
    standardNumber: row.standard_number,
    conclusion: row.conclusion,
  };
}

const AI_FLAGGED: ItemStatus = "ai_flagged";

/**
 * Tenant-scoped store for the human reviewer workflow. Implements the workflow
 * engine's {@link HumanReviewStore} port — the ONLY path that persists a
 * {@link FinalConclusion}. Applying a review requires the WRITE permission (CAE
 * and Audit Staff; Board/Audit Committee is read-only and cannot review).
 *
 * For each review:
 *  1. loads the AI draft by id and verifies it has not already been reviewed;
 *  2. verifies the item is `ai_flagged` (the only reviewable entry state);
 *  3. resolves the reviewer's action via the pure {@link resolveHumanReview};
 *  4. transitions `ai_flagged → under_human_review → outcome` through the item
 *     status repository (state-machine enforced + audited per transition);
 *  5. records the full decision trail (original draft, action, edits, provenance,
 *     content pin) in `human_review_decisions` and the immutable audit log;
 *  6. persists a final conclusion row for accept / edit_accept only.
 */
export class TenantHumanReviewRepository
  extends AuditedRepository
  implements HumanReviewStore, FinalConclusionReader
{
  private readonly itemStatus: TenantItemStatusRepository;
  private readonly draftFindings: TenantDraftFindingRepository;

  constructor(exec: ScopedExecutor, session: AuthSession) {
    super(exec, session);
    this.itemStatus = new TenantItemStatusRepository(exec, session);
    this.draftFindings = new TenantDraftFindingRepository(exec, session);
  }

  async applyReview(input: HumanReviewInput): Promise<HumanReviewResult> {
    authorize(this.session, PERMISSIONS.WRITE);

    const draft = await this.draftFindings.getById(input.findingId);
    if (!draft) {
      throw new DraftFindingNotFoundError(
        `No draft finding '${input.findingId}' in this tenant.`,
      );
    }

    const reviewedRows = await this.exec.query<ReviewedRow>(
      `SELECT reviewed_at FROM ${this.exec.table("draft_findings")}
        WHERE finding_id = $1`,
      [input.findingId],
    );
    if (reviewedRows[0]?.reviewed_at) {
      throw new DraftAlreadyReviewedError(
        `Draft finding '${input.findingId}' has already been human-reviewed.`,
      );
    }

    const current = await this.itemStatus.getStatus(
      draft.assessmentId,
      draft.questionId,
    );
    if (current?.status !== AI_FLAGGED) {
      throw new IllegalReviewStateError(
        `Human review requires item status '${AI_FLAGGED}', got ` +
          `'${current?.status ?? "not_assessed"}'.`,
      );
    }

    const outcome = resolveHumanReview(
      draft,
      input.action,
      input.editedConclusion,
    );
    const reviewedAt = new Date().toISOString();

    await this.itemStatus.transition({
      assessmentId: draft.assessmentId,
      questionId: draft.questionId,
      to: "under_human_review",
    });
    await this.itemStatus.transition({
      assessmentId: draft.assessmentId,
      questionId: draft.questionId,
      to: outcome.statusPath[1],
    });

    const decisionId = randomUUID();
    await this.exec.query(
      `INSERT INTO ${this.exec.table("human_review_decisions")}
         (decision_id, finding_id, assessment_id, question_id, standard_number,
          review_action, original_draft_summary, edited_text, prompt_version,
          rubric_version, model_adapter, adapter_location, content_pack_id,
          content_version, content_hash, reviewed_by, reviewed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        decisionId,
        input.findingId,
        draft.assessmentId,
        draft.questionId,
        draft.standardNumber,
        outcome.action,
        outcome.originalDraftSummary,
        outcome.editedText,
        outcome.provenance.promptVersion,
        outcome.provenance.rubricVersion,
        outcome.provenance.modelAdapter,
        outcome.provenance.adapterLocation,
        outcome.contentPin.contentPackId,
        outcome.contentPin.version,
        outcome.contentPin.contentHash,
        this.session.userId,
        reviewedAt,
      ],
    );

    let conclusionId: string | null = null;
    if (outcome.finalConclusion) {
      conclusionId = randomUUID();
      await this.exec.query(
        `INSERT INTO ${this.exec.table("final_conclusions")}
           (conclusion_id, decision_id, finding_id, assessment_id, question_id,
            standard_number, conclusion, reviewed_by, reviewed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          conclusionId,
          decisionId,
          input.findingId,
          draft.assessmentId,
          draft.questionId,
          draft.standardNumber,
          outcome.finalConclusion.conclusion,
          this.session.userId,
          reviewedAt,
        ],
      );
    }

    await this.exec.query(
      `UPDATE ${this.exec.table("draft_findings")}
          SET reviewed_at = $1
        WHERE finding_id = $2`,
      [reviewedAt, input.findingId],
    );

    await this.audit.append({
      action: "create",
      entity: "human_review_decision",
      entityId: decisionId,
      oldValue: {
        draftFindingId: input.findingId,
        draftSummary: outcome.originalDraftSummary,
        itemStatus: AI_FLAGGED,
      },
      newValue: {
        action: outcome.action,
        editedText: outcome.editedText,
        finalConclusion: outcome.finalConclusion?.conclusion ?? null,
        conclusionId,
        promptVersion: outcome.provenance.promptVersion,
        rubricVersion: outcome.provenance.rubricVersion,
        modelAdapter: outcome.provenance.modelAdapter,
        adapterLocation: outcome.provenance.adapterLocation,
        contentPin: {
          contentPackId: outcome.contentPin.contentPackId,
          version: outcome.contentPin.version,
          contentHash: outcome.contentPin.contentHash,
        },
        itemStatus: outcome.statusPath[1],
        reviewedBy: this.session.userId,
        reviewedAt,
      },
    });

    return {
      outcome,
      finalItemStatus: outcome.statusPath[1],
    };
  }

  async getForAssessment(assessmentId: string): Promise<FinalConclusion[]> {
    authorize(this.session, PERMISSIONS.READ);
    const rows = await this.exec.query<FinalConclusionRow>(
      `SELECT assessment_id, question_id, standard_number, conclusion
         FROM ${this.exec.table("final_conclusions")}
        WHERE assessment_id = $1
        ORDER BY reviewed_at, conclusion_id`,
      [assessmentId],
    );
    return rows.map(toFinalConclusion);
  }
}
