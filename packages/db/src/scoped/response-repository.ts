import { type AuthSession, authorize, PERMISSIONS } from "@eqa/auth";
import type {
  AssessmentResponse,
  AssessmentResponseInput,
  ResponseStore,
} from "@eqa/workflows";
import type { Row } from "../sql-client";
import { AuditedRepository } from "./audited-repository";
import type { ScopedExecutor } from "./scoped-executor";

interface ResponseRow extends Row {
  assessment_id: string;
  question_id: string;
  answer: string;
  note: string | null;
  content_pack_id: string;
  content_version: string;
  content_hash: string;
  responded_by: string;
  responded_at: string;
}

function responseKey(assessmentId: string, questionId: string): string {
  return `${assessmentId}::${questionId}`;
}

function toResponse(row: ResponseRow): AssessmentResponse {
  return {
    assessmentId: row.assessment_id,
    questionId: row.question_id,
    answer: row.answer,
    note: row.note,
    pin: {
      contentPackId: row.content_pack_id,
      version: row.content_version,
      contentHash: row.content_hash,
    },
    respondedBy: row.responded_by,
    respondedAt: row.responded_at,
  };
}

/**
 * Tenant-scoped store for questionnaire responses. Implements the workflow
 * engine's {@link ResponseStore} port. Submitting requires the WRITE permission
 * (CAE and Audit Staff; Board/Audit Committee is read-only and cannot submit),
 * and each write is audited automatically via {@link AuditedRepository}. Every
 * row records the content pin it was answered against.
 */
export class TenantResponseRepository
  extends AuditedRepository
  implements ResponseStore
{
  constructor(exec: ScopedExecutor, session: AuthSession) {
    super(exec, session);
  }

  async submit(input: AssessmentResponseInput): Promise<void> {
    authorize(this.session, PERMISSIONS.WRITE);
    const key = responseKey(input.assessmentId, input.questionId);
    await this.recordWrite({
      entity: "assessment_response",
      entityId: key,
      readValue: () => this.readRaw(key),
      write: () => this.writeRaw(key, input),
    });
  }

  async getForAssessment(assessmentId: string): Promise<AssessmentResponse[]> {
    authorize(this.session, PERMISSIONS.READ);
    const rows = await this.exec.query<ResponseRow>(
      `SELECT assessment_id, question_id, answer, note, content_pack_id,
              content_version, content_hash, responded_by, responded_at
         FROM ${this.exec.table("assessment_responses")}
        WHERE assessment_id = $1
        ORDER BY question_id`,
      [assessmentId],
    );
    return rows.map(toResponse);
  }

  private async readRaw(key: string): Promise<AssessmentResponse | null> {
    const rows = await this.exec.query<ResponseRow>(
      `SELECT assessment_id, question_id, answer, note, content_pack_id,
              content_version, content_hash, responded_by, responded_at
         FROM ${this.exec.table("assessment_responses")}
        WHERE response_key = $1`,
      [key],
    );
    const row = rows[0];
    return row ? toResponse(row) : null;
  }

  private async writeRaw(
    key: string,
    input: AssessmentResponseInput,
  ): Promise<void> {
    await this.exec.query(
      `INSERT INTO ${this.exec.table("assessment_responses")}
         (response_key, assessment_id, question_id, answer, note,
          content_pack_id, content_version, content_hash,
          responded_by, responded_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (response_key) DO UPDATE SET
         answer = EXCLUDED.answer,
         note = EXCLUDED.note,
         content_pack_id = EXCLUDED.content_pack_id,
         content_version = EXCLUDED.content_version,
         content_hash = EXCLUDED.content_hash,
         responded_by = EXCLUDED.responded_by,
         responded_at = EXCLUDED.responded_at`,
      [
        key,
        input.assessmentId,
        input.questionId,
        input.answer,
        input.note ?? null,
        input.pin.contentPackId,
        input.pin.version,
        input.pin.contentHash,
        this.session.userId,
        new Date().toISOString(),
      ],
    );
  }
}
