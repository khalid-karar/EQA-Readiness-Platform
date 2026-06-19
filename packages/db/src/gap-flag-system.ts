import { randomUUID } from "node:crypto";
import { AuditLog } from "@eqa/audit-log";
import type { TenantContext } from "@eqa/tenant";
import {
  assertTransition,
  INITIAL_ITEM_STATUS,
  type DraftFinding,
  type GapFlagSink,
  type ItemStatus,
} from "@eqa/workflows";
import type { Database } from "./database";
import { TenantAuditStore } from "./scoped/audit-store";
import { ScopedExecutor } from "./scoped/scoped-executor";
import type { Row } from "./sql-client";

/**
 * Actor recorded for the system-initiated (non-user) writes the gap-flagging job
 * performs. The AI job is a background system action, not a user mutation, so it
 * carries no user RBAC role — but its writes are still tenant-isolated and
 * audited, the same pattern as the malware-scan status writer.
 */
const SYSTEM_AI_GAP_ACTOR = { userId: "system:ai-gap-flag", role: "system" };

/** The status the gap-flagging job moves a flagged item into (Step 8). */
const AI_FLAGGED: ItemStatus = "ai_flagged";

interface StatusRow extends Row {
  status: string;
}

function statusKey(assessmentId: string, questionId: string): string {
  return `${assessmentId}::${questionId}`;
}

/**
 * Builds the data-layer sink the gap-flagging job hands a produced draft finding.
 * In one tenant-scoped, system-audited unit of work it:
 *
 *  1. validates the move to `ai_flagged` against the state machine
 *     ({@link assertTransition}) BEFORE any write — so a draft is never persisted
 *     for an item that is not in a flaggable state (fails closed);
 *  2. persists the draft finding (rule-12 provenance + content pin), recording a
 *     `create` audit entry for it;
 *  3. transitions the item to `ai_flagged`, recording a `status_change` entry.
 *
 * The draft is stored as work product only — its `status` column is fixed to
 * `draft`. There is no path here that turns it into a final conclusion; that
 * happens only through the Step 11 human-review workflow.
 */
export function createGapFlagSink(db: Database): GapFlagSink {
  return {
    async recordDraftFinding(
      tenant: TenantContext,
      finding: DraftFinding,
    ): Promise<void> {
      const exec = new ScopedExecutor(db, tenant);
      const audit = new AuditLog(
        new TenantAuditStore(exec),
        SYSTEM_AI_GAP_ACTOR,
      );

      const key = statusKey(finding.assessmentId, finding.questionId);
      const statusRows = await exec.query<StatusRow>(
        `SELECT status FROM ${exec.table("assessment_item_status")}
          WHERE status_key = $1`,
        [key],
      );
      const from = (statusRows[0]?.status as ItemStatus) ?? INITIAL_ITEM_STATUS;
      // Data-layer gate: reject before writing anything if AI-flagging the item
      // is not a legal move from its current status.
      assertTransition(from, AI_FLAGGED);

      const findingId = randomUUID();
      await exec.query(
        `INSERT INTO ${exec.table("draft_findings")}
           (finding_id, assessment_id, question_id, standard_number,
            draft_summary, status, prompt_version, rubric_version,
            model_adapter, adapter_location, input_summary,
            content_pack_id, content_version, content_hash,
            created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          findingId,
          finding.assessmentId,
          finding.questionId,
          finding.standardNumber,
          finding.draftSummary,
          finding.provenance.promptVersion,
          finding.provenance.rubricVersion,
          finding.provenance.modelAdapter,
          finding.provenance.adapterLocation,
          finding.provenance.inputSummary,
          finding.contentPin.contentPackId,
          finding.contentPin.version,
          finding.contentPin.contentHash,
          SYSTEM_AI_GAP_ACTOR.userId,
          finding.provenance.timestamp,
        ],
      );
      await audit.append({
        action: "create",
        entity: "draft_finding",
        entityId: findingId,
        oldValue: null,
        newValue: {
          assessmentId: finding.assessmentId,
          questionId: finding.questionId,
          standardNumber: finding.standardNumber,
          status: "draft",
          promptVersion: finding.provenance.promptVersion,
          rubricVersion: finding.provenance.rubricVersion,
          modelAdapter: finding.provenance.modelAdapter,
          adapterLocation: finding.provenance.adapterLocation,
          contentPin: {
            contentPackId: finding.contentPin.contentPackId,
            version: finding.contentPin.version,
            contentHash: finding.contentPin.contentHash,
          },
        },
      });

      const updatedAt = finding.provenance.timestamp;
      await exec.query(
        `INSERT INTO ${exec.table("assessment_item_status")}
           (status_key, assessment_id, question_id, status, updated_by, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (status_key) DO UPDATE SET
           status = EXCLUDED.status,
           updated_by = EXCLUDED.updated_by,
           updated_at = EXCLUDED.updated_at`,
        [
          key,
          finding.assessmentId,
          finding.questionId,
          AI_FLAGGED,
          SYSTEM_AI_GAP_ACTOR.userId,
          updatedAt,
        ],
      );
      await audit.append({
        action: "status_change",
        entity: "assessment_item_status",
        entityId: key,
        oldValue: from,
        newValue: AI_FLAGGED,
      });
    },
  };
}
