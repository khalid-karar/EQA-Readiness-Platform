import type { AdapterLocation } from "@eqa/ai";
import { type AuthSession, authorize, PERMISSIONS } from "@eqa/auth";
import type { DraftFinding, DraftFindingReader } from "@eqa/workflows";
import type { Row } from "../sql-client";
import { AuditedRepository } from "./audited-repository";
import type { ScopedExecutor } from "./scoped-executor";

interface DraftFindingRow extends Row {
  finding_id: string;
  assessment_id: string;
  question_id: string;
  standard_number: string;
  draft_summary: string;
  prompt_version: string;
  rubric_version: string;
  model_adapter: string;
  adapter_location: string;
  input_summary: string;
  content_pack_id: string;
  content_version: string;
  content_hash: string;
  created_at: string;
  reviewed_at: string | null;
}

function toDraftFinding(row: DraftFindingRow): DraftFinding {
  return {
    kind: "draft_finding",
    status: "draft",
    findingId: row.finding_id,
    assessmentId: row.assessment_id,
    questionId: row.question_id,
    standardNumber: row.standard_number,
    draftSummary: row.draft_summary,
    provenance: {
      promptVersion: row.prompt_version,
      rubricVersion: row.rubric_version,
      modelAdapter: row.model_adapter,
      adapterLocation: row.adapter_location as AdapterLocation,
      inputSummary: row.input_summary,
      output: row.draft_summary,
      timestamp: row.created_at,
    },
    contentPin: {
      assessmentId: row.assessment_id,
      contentPackId: row.content_pack_id,
      version: row.content_version,
      contentHash: row.content_hash,
    },
    requiresHumanReview: true,
  };
}

/**
 * Tenant-scoped, read-only access to AI-drafted gap findings. Implements the
 * workflow engine's {@link DraftFindingReader} port. Reads require the READ
 * permission (all roles), and every row comes back typed as {@link DraftFinding}
 * (always draft, `requiresHumanReview: true`), so a reader cannot mistake a draft
 * for a final conclusion. Findings are produced by the system-side gap-flagging
 * sink; there is intentionally no user-facing write here.
 */
export class TenantDraftFindingRepository
  extends AuditedRepository
  implements DraftFindingReader
{
  constructor(exec: ScopedExecutor, session: AuthSession) {
    super(exec, session);
  }

  async getForAssessment(assessmentId: string): Promise<DraftFinding[]> {
    authorize(this.session, PERMISSIONS.READ);
    const rows = await this.exec.query<DraftFindingRow>(
      `SELECT finding_id, assessment_id, question_id, standard_number,
              draft_summary, prompt_version, rubric_version, model_adapter,
              adapter_location, input_summary, content_pack_id, content_version,
              content_hash, created_at, reviewed_at
         FROM ${this.exec.table("draft_findings")}
        WHERE assessment_id = $1
        ORDER BY created_at, finding_id`,
      [assessmentId],
    );
    return rows.map(toDraftFinding);
  }

  async getById(findingId: string): Promise<DraftFinding | null> {
    authorize(this.session, PERMISSIONS.READ);
    const rows = await this.exec.query<DraftFindingRow>(
      `SELECT finding_id, assessment_id, question_id, standard_number,
              draft_summary, prompt_version, rubric_version, model_adapter,
              adapter_location, input_summary, content_pack_id, content_version,
              content_hash, created_at, reviewed_at
         FROM ${this.exec.table("draft_findings")}
        WHERE finding_id = $1`,
      [findingId],
    );
    const row = rows[0];
    return row ? toDraftFinding(row) : null;
  }
}
