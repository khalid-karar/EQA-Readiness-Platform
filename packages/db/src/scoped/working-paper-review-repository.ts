import { randomUUID } from "node:crypto";
import { type AuthSession, authorize, PERMISSIONS } from "@eqa/auth";
import type {
  AuditEngagement,
  AuditFile,
  ChecklistResult,
  CreateAuditEngagementInput,
  CreateAuditFileInput,
  CreateReviewChecklistInput,
  CreateSampleSelectionInput,
  CreateWorkingPaperInput,
  RecordChecklistResultInput,
  ReviewChecklist,
  ReviewChecklistPin,
  SampleSelection,
  WorkingPaper,
} from "@eqa/content";
import type {
  EngagementHierarchy,
  WorkingPaperReviewStore,
} from "@eqa/workflows";
import type { Row } from "../sql-client";
import { AuditedRepository } from "./audited-repository";
import type { ScopedExecutor } from "./scoped-executor";

interface EngagementRow extends Row {
  engagement_id: string;
  title: string;
  period_start: string;
  period_end: string;
  status: string;
  created_by: string;
  created_at: string;
}

interface FileRow extends Row {
  file_id: string;
  engagement_id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
}

interface WorkingPaperRow extends Row {
  working_paper_id: string;
  file_id: string;
  reference: string;
  title: string;
  prepared_by: string;
  prepared_at: string;
}

interface ChecklistRow extends Row {
  checklist_id: string;
  working_paper_id: string;
  standard_number: string;
  content_pack_id: string;
  content_version: string;
  content_hash: string;
  created_by: string;
  created_at: string;
}

interface ResultRow extends Row {
  result_id: string;
  checklist_id: string;
  checklist_item_id: string;
  conformance: string;
  note: string | null;
  recorded_by: string;
  recorded_at: string;
}

interface SelectionRow extends Row {
  selection_id: string;
  engagement_id: string;
  rationale: string;
  selected_by: string;
  selected_at: string;
}

function toPin(row: {
  content_pack_id: string;
  content_version: string;
  content_hash: string;
}): ReviewChecklistPin {
  return {
    contentPackId: row.content_pack_id,
    version: row.content_version,
    contentHash: row.content_hash,
  };
}

function toEngagement(row: EngagementRow): AuditEngagement {
  return {
    engagementId: row.engagement_id,
    title: row.title,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    status: row.status as AuditEngagement["status"],
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function toFile(row: FileRow): AuditFile {
  return {
    fileId: row.file_id,
    engagementId: row.engagement_id,
    name: row.name,
    description: row.description,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function toWorkingPaper(row: WorkingPaperRow): WorkingPaper {
  return {
    workingPaperId: row.working_paper_id,
    fileId: row.file_id,
    reference: row.reference,
    title: row.title,
    preparedBy: row.prepared_by,
    preparedAt: row.prepared_at,
  };
}

function toChecklist(row: ChecklistRow): ReviewChecklist {
  return {
    checklistId: row.checklist_id,
    workingPaperId: row.working_paper_id,
    standardNumber: row.standard_number,
    pin: toPin(row),
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function toResult(row: ResultRow): ChecklistResult {
  return {
    resultId: row.result_id,
    checklistId: row.checklist_id,
    checklistItemId: row.checklist_item_id,
    conformance: row.conformance as ChecklistResult["conformance"],
    note: row.note,
    recordedBy: row.recorded_by,
    recordedAt: row.recorded_at,
  };
}

function toSelection(row: SelectionRow): SampleSelection {
  return {
    selectionId: row.selection_id,
    engagementId: row.engagement_id,
    rationale: row.rationale,
    selectedBy: row.selected_by,
    selectedAt: row.selected_at,
  };
}

/**
 * Tenant-scoped repository for the working-paper review data model. Covers the
 * full entity hierarchy (engagement → file → working paper → review checklist →
 * checklist result) plus sample selections. All writes require WRITE (CAE and
 * Audit Staff; Board is read-only), reads require READ, and every mutation is
 * audited automatically via {@link AuditedRepository}.
 *
 * Review checklists reference the Step 5 Working-Paper Review Checklist by
 * content pin only — checklist item text is never duplicated in the DB.
 */
export class TenantWorkingPaperReviewRepository
  extends AuditedRepository
  implements WorkingPaperReviewStore
{
  constructor(exec: ScopedExecutor, session: AuthSession) {
    super(exec, session);
  }

  // --- Audit Engagement ---

  async createEngagement(
    input: CreateAuditEngagementInput,
  ): Promise<AuditEngagement> {
    authorize(this.session, PERMISSIONS.WRITE);
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    return this.recordWrite({
      entity: "audit_engagement",
      entityId: id,
      readValue: () => this.getEngagement(id),
      write: async () => {
        await this.exec.query(
          `INSERT INTO ${this.exec.table("audit_engagements")}
             (engagement_id, title, period_start, period_end, status,
              created_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            id,
            input.title,
            input.periodStart,
            input.periodEnd,
            input.status ?? "completed",
            this.session.userId,
            createdAt,
          ],
        );
        return {
          engagementId: id,
          title: input.title,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          status: input.status ?? "completed",
          createdBy: this.session.userId,
          createdAt,
        };
      },
    });
  }

  async getEngagement(engagementId: string): Promise<AuditEngagement | null> {
    authorize(this.session, PERMISSIONS.READ);
    const rows = await this.exec.query<EngagementRow>(
      `SELECT engagement_id, title, period_start, period_end, status,
              created_by, created_at
         FROM ${this.exec.table("audit_engagements")}
        WHERE engagement_id = $1`,
      [engagementId],
    );
    const row = rows[0];
    return row ? toEngagement(row) : null;
  }

  async listEngagements(): Promise<AuditEngagement[]> {
    authorize(this.session, PERMISSIONS.READ);
    const rows = await this.exec.query<EngagementRow>(
      `SELECT engagement_id, title, period_start, period_end, status,
              created_by, created_at
         FROM ${this.exec.table("audit_engagements")}
        ORDER BY created_at, engagement_id`,
    );
    return rows.map(toEngagement);
  }

  // --- Audit File ---

  async createFile(input: CreateAuditFileInput): Promise<AuditFile> {
    authorize(this.session, PERMISSIONS.WRITE);
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    return this.recordWrite({
      entity: "audit_file",
      entityId: id,
      readValue: () => this.getFile(id),
      write: async () => {
        await this.exec.query(
          `INSERT INTO ${this.exec.table("audit_files")}
             (file_id, engagement_id, name, description, created_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            id,
            input.engagementId,
            input.name,
            input.description ?? null,
            this.session.userId,
            createdAt,
          ],
        );
        return {
          fileId: id,
          engagementId: input.engagementId,
          name: input.name,
          description: input.description ?? null,
          createdBy: this.session.userId,
          createdAt,
        };
      },
    });
  }

  async getFile(fileId: string): Promise<AuditFile | null> {
    authorize(this.session, PERMISSIONS.READ);
    const rows = await this.exec.query<FileRow>(
      `SELECT file_id, engagement_id, name, description, created_by, created_at
         FROM ${this.exec.table("audit_files")}
        WHERE file_id = $1`,
      [fileId],
    );
    const row = rows[0];
    return row ? toFile(row) : null;
  }

  async getFilesForEngagement(engagementId: string): Promise<AuditFile[]> {
    authorize(this.session, PERMISSIONS.READ);
    const rows = await this.exec.query<FileRow>(
      `SELECT file_id, engagement_id, name, description, created_by, created_at
         FROM ${this.exec.table("audit_files")}
        WHERE engagement_id = $1
        ORDER BY created_at, file_id`,
      [engagementId],
    );
    return rows.map(toFile);
  }

  // --- Working Paper ---

  async createWorkingPaper(
    input: CreateWorkingPaperInput,
  ): Promise<WorkingPaper> {
    authorize(this.session, PERMISSIONS.WRITE);
    const id = randomUUID();
    const preparedAt = input.preparedAt ?? new Date().toISOString();
    return this.recordWrite({
      entity: "working_paper",
      entityId: id,
      readValue: () => this.getWorkingPaper(id),
      write: async () => {
        await this.exec.query(
          `INSERT INTO ${this.exec.table("working_papers")}
             (working_paper_id, file_id, reference, title, prepared_by, prepared_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            id,
            input.fileId,
            input.reference,
            input.title,
            this.session.userId,
            preparedAt,
          ],
        );
        return {
          workingPaperId: id,
          fileId: input.fileId,
          reference: input.reference,
          title: input.title,
          preparedBy: this.session.userId,
          preparedAt,
        };
      },
    });
  }

  async getWorkingPaper(workingPaperId: string): Promise<WorkingPaper | null> {
    authorize(this.session, PERMISSIONS.READ);
    const rows = await this.exec.query<WorkingPaperRow>(
      `SELECT working_paper_id, file_id, reference, title, prepared_by, prepared_at
         FROM ${this.exec.table("working_papers")}
        WHERE working_paper_id = $1`,
      [workingPaperId],
    );
    const row = rows[0];
    return row ? toWorkingPaper(row) : null;
  }

  async getWorkingPapersForFile(fileId: string): Promise<WorkingPaper[]> {
    authorize(this.session, PERMISSIONS.READ);
    const rows = await this.exec.query<WorkingPaperRow>(
      `SELECT working_paper_id, file_id, reference, title, prepared_by, prepared_at
         FROM ${this.exec.table("working_papers")}
        WHERE file_id = $1
        ORDER BY prepared_at, working_paper_id`,
      [fileId],
    );
    return rows.map(toWorkingPaper);
  }

  // --- Review Checklist ---

  async createChecklist(
    input: CreateReviewChecklistInput,
  ): Promise<ReviewChecklist> {
    authorize(this.session, PERMISSIONS.WRITE);
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    return this.recordWrite({
      entity: "review_checklist",
      entityId: id,
      readValue: () => this.getChecklist(id),
      write: async () => {
        await this.exec.query(
          `INSERT INTO ${this.exec.table("review_checklists")}
             (checklist_id, working_paper_id, standard_number,
              content_pack_id, content_version, content_hash,
              created_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            id,
            input.workingPaperId,
            input.standardNumber,
            input.pin.contentPackId,
            input.pin.version,
            input.pin.contentHash,
            this.session.userId,
            createdAt,
          ],
        );
        return {
          checklistId: id,
          workingPaperId: input.workingPaperId,
          standardNumber: input.standardNumber,
          pin: input.pin,
          createdBy: this.session.userId,
          createdAt,
        };
      },
    });
  }

  async getChecklist(checklistId: string): Promise<ReviewChecklist | null> {
    authorize(this.session, PERMISSIONS.READ);
    const rows = await this.exec.query<ChecklistRow>(
      `SELECT checklist_id, working_paper_id, standard_number,
              content_pack_id, content_version, content_hash,
              created_by, created_at
         FROM ${this.exec.table("review_checklists")}
        WHERE checklist_id = $1`,
      [checklistId],
    );
    const row = rows[0];
    return row ? toChecklist(row) : null;
  }

  async getChecklistsForWorkingPaper(
    workingPaperId: string,
  ): Promise<ReviewChecklist[]> {
    authorize(this.session, PERMISSIONS.READ);
    const rows = await this.exec.query<ChecklistRow>(
      `SELECT checklist_id, working_paper_id, standard_number,
              content_pack_id, content_version, content_hash,
              created_by, created_at
         FROM ${this.exec.table("review_checklists")}
        WHERE working_paper_id = $1
        ORDER BY created_at, checklist_id`,
      [workingPaperId],
    );
    return rows.map(toChecklist);
  }

  // --- Checklist Result ---

  async recordChecklistResult(
    input: RecordChecklistResultInput,
  ): Promise<ChecklistResult> {
    authorize(this.session, PERMISSIONS.WRITE);
    const id = randomUUID();
    const recordedAt = new Date().toISOString();
    const key = `${input.checklistId}::${input.checklistItemId}`;
    return this.recordWrite({
      entity: "checklist_result",
      entityId: key,
      readValue: () =>
        this.getResultByItem(input.checklistId, input.checklistItemId),
      write: async () => {
        await this.exec.query(
          `INSERT INTO ${this.exec.table("checklist_results")}
             (result_id, checklist_id, checklist_item_id, conformance,
              note, recorded_by, recorded_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (checklist_id, checklist_item_id) DO UPDATE SET
             conformance = EXCLUDED.conformance,
             note = EXCLUDED.note,
             recorded_by = EXCLUDED.recorded_by,
             recorded_at = EXCLUDED.recorded_at`,
          [
            id,
            input.checklistId,
            input.checklistItemId,
            input.conformance,
            input.note ?? null,
            this.session.userId,
            recordedAt,
          ],
        );
        return {
          resultId: id,
          checklistId: input.checklistId,
          checklistItemId: input.checklistItemId,
          conformance: input.conformance,
          note: input.note ?? null,
          recordedBy: this.session.userId,
          recordedAt,
        };
      },
    });
  }

  async getChecklistResult(resultId: string): Promise<ChecklistResult | null> {
    authorize(this.session, PERMISSIONS.READ);
    const rows = await this.exec.query<ResultRow>(
      `SELECT result_id, checklist_id, checklist_item_id, conformance,
              note, recorded_by, recorded_at
         FROM ${this.exec.table("checklist_results")}
        WHERE result_id = $1`,
      [resultId],
    );
    const row = rows[0];
    return row ? toResult(row) : null;
  }

  private async getResultByItem(
    checklistId: string,
    checklistItemId: string,
  ): Promise<ChecklistResult | null> {
    const rows = await this.exec.query<ResultRow>(
      `SELECT result_id, checklist_id, checklist_item_id, conformance,
              note, recorded_by, recorded_at
         FROM ${this.exec.table("checklist_results")}
        WHERE checklist_id = $1 AND checklist_item_id = $2`,
      [checklistId, checklistItemId],
    );
    const row = rows[0];
    return row ? toResult(row) : null;
  }

  async getResultsForChecklist(
    checklistId: string,
  ): Promise<ChecklistResult[]> {
    authorize(this.session, PERMISSIONS.READ);
    const rows = await this.exec.query<ResultRow>(
      `SELECT result_id, checklist_id, checklist_item_id, conformance,
              note, recorded_by, recorded_at
         FROM ${this.exec.table("checklist_results")}
        WHERE checklist_id = $1
        ORDER BY checklist_item_id`,
      [checklistId],
    );
    return rows.map(toResult);
  }

  // --- Sample Selection ---

  async createSampleSelection(
    input: CreateSampleSelectionInput,
  ): Promise<SampleSelection> {
    authorize(this.session, PERMISSIONS.WRITE);
    const id = randomUUID();
    const selectedAt = new Date().toISOString();
    return this.recordWrite({
      entity: "sample_selection",
      entityId: id,
      readValue: () => this.getSampleSelection(id),
      write: async () => {
        await this.exec.query(
          `INSERT INTO ${this.exec.table("sample_selections")}
             (selection_id, engagement_id, rationale, selected_by, selected_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            id,
            input.engagementId,
            input.rationale,
            this.session.userId,
            selectedAt,
          ],
        );
        return {
          selectionId: id,
          engagementId: input.engagementId,
          rationale: input.rationale,
          selectedBy: this.session.userId,
          selectedAt,
        };
      },
    });
  }

  async getSampleSelection(
    selectionId: string,
  ): Promise<SampleSelection | null> {
    authorize(this.session, PERMISSIONS.READ);
    const rows = await this.exec.query<SelectionRow>(
      `SELECT selection_id, engagement_id, rationale, selected_by, selected_at
         FROM ${this.exec.table("sample_selections")}
        WHERE selection_id = $1`,
      [selectionId],
    );
    const row = rows[0];
    return row ? toSelection(row) : null;
  }

  async getSelectionsForEngagement(
    engagementId: string,
  ): Promise<SampleSelection[]> {
    authorize(this.session, PERMISSIONS.READ);
    const rows = await this.exec.query<SelectionRow>(
      `SELECT selection_id, engagement_id, rationale, selected_by, selected_at
         FROM ${this.exec.table("sample_selections")}
        WHERE engagement_id = $1
        ORDER BY selected_at, selection_id`,
      [engagementId],
    );
    return rows.map(toSelection);
  }

  // --- WorkingPaperReviewStore port (Step 12 workflow) ---

  /** Alias for {@link createSampleSelection}. */
  selectSample(input: CreateSampleSelectionInput): Promise<SampleSelection> {
    return this.createSampleSelection(input);
  }

  /** Alias for {@link recordChecklistResult}. */
  recordResult(input: RecordChecklistResultInput): Promise<ChecklistResult> {
    return this.recordChecklistResult(input);
  }

  async listSamples(): Promise<SampleSelection[]> {
    return this.listSampleSelections();
  }

  async listCompletedEngagements(): Promise<AuditEngagement[]> {
    const all = await this.listEngagements();
    return all.filter((e) => e.status === "completed");
  }

  async listSampleSelections(): Promise<SampleSelection[]> {
    authorize(this.session, PERMISSIONS.READ);
    const rows = await this.exec.query<SelectionRow>(
      `SELECT selection_id, engagement_id, rationale, selected_by, selected_at
         FROM ${this.exec.table("sample_selections")}
        ORDER BY selected_at, selection_id`,
    );
    return rows.map(toSelection);
  }

  async getEngagementHierarchy(
    engagementId: string,
  ): Promise<EngagementHierarchy | null> {
    authorize(this.session, PERMISSIONS.READ);
    const engagement = await this.getEngagement(engagementId);
    if (!engagement) return null;

    const files = await this.getFilesForEngagement(engagementId);
    const fileNodes = await Promise.all(
      files.map(async (file) => {
        const papers = await this.getWorkingPapersForFile(file.fileId);
        const paperNodes = await Promise.all(
          papers.map(async (paper) => ({
            paper,
            checklists: await this.getChecklistsForWorkingPaper(
              paper.workingPaperId,
            ),
          })),
        );
        return { file, papers: paperNodes };
      }),
    );

    return { engagement, files: fileNodes };
  }
}
