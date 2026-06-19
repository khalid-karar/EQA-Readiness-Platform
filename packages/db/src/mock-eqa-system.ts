import { AuditLog } from "@eqa/audit-log";
import type { ContentCatalog } from "@eqa/content";
import { loadBundledCatalog } from "@eqa/content";
import type { TenantContext } from "@eqa/tenant";
import {
  aggregateEngagementConformance,
  assertReadinessSimulation,
  READINESS_SIMULATION_KIND,
  renderQuestionnaire,
  type EngagementHierarchy,
  type FinalConclusion,
  type ItemStatus,
  type MockEqaScoringInput,
  type MockEqaScoringLoader,
  type MockEqaSimulationPayload,
  type MockEqaSimulationResult,
  type MockEqaSimulationSink,
  type StandardConformanceSummary,
} from "@eqa/workflows";
import type { Database } from "./database";
import { TenantAuditStore } from "./scoped/audit-store";
import { ScopedExecutor } from "./scoped/scoped-executor";
import type { Row } from "./sql-client";

const SYSTEM_MOCK_EQA_ACTOR = {
  userId: "system:mock-eqa",
  role: "system",
};

interface StatusRow extends Row {
  question_id: string;
  status: string;
}

interface ConclusionRow extends Row {
  assessment_id: string;
  question_id: string;
  standard_number: string;
  conclusion: string;
}

interface SimulationRow extends Row {
  simulation_id: string;
  assessment_id: string;
  kind: string;
  overall_score: number;
  overall_level: string;
  payload_json: string;
  run_by: string;
  run_at: string;
}

function toFinalConclusion(row: ConclusionRow): FinalConclusion {
  return {
    kind: "final_conclusion",
    assessmentId: row.assessment_id,
    questionId: row.question_id,
    standardNumber: row.standard_number,
    conclusion: row.conclusion,
  };
}

function parseSimulationRow(row: SimulationRow): MockEqaSimulationResult {
  const parsed: unknown = JSON.parse(row.payload_json);
  assertReadinessSimulation(parsed);
  if (parsed.simulationId !== row.simulation_id) {
    throw new Error("Simulation id mismatch between row and payload.");
  }
  return parsed;
}

async function loadConformanceByStandard(
  exec: ScopedExecutor,
  catalog: ContentCatalog,
  engagementId: string | undefined,
): Promise<Map<string, StandardConformanceSummary>> {
  const map = new Map<string, StandardConformanceSummary>();
  if (!engagementId) return map;

  const hierarchyRows = await exec.query<Row>(
    `SELECT engagement_id FROM ${exec.table("audit_engagements")}
      WHERE engagement_id = $1`,
    [engagementId],
  );
  if (hierarchyRows.length === 0) return map;

  const hierarchy = await loadEngagementHierarchy(exec, engagementId);
  if (!hierarchy) return map;

  const resultsByChecklist = await loadChecklistResults(exec, hierarchy);
  const summary = aggregateEngagementConformance(
    hierarchy,
    catalog,
    resultsByChecklist,
  );
  for (const standard of summary.byStandard) {
    map.set(standard.standardNumber, standard);
  }
  return map;
}

async function loadEngagementHierarchy(
  exec: ScopedExecutor,
  engagementId: string,
): Promise<EngagementHierarchy | null> {
  const engagementRows = await exec.query<Row>(
    `SELECT engagement_id, title, period_start, period_end, status, created_by, created_at
       FROM ${exec.table("audit_engagements")}
      WHERE engagement_id = $1`,
    [engagementId],
  );
  const engagement = engagementRows[0];
  if (!engagement) return null;

  const fileRows = await exec.query<Row>(
    `SELECT file_id, engagement_id, name, description, created_by, created_at
       FROM ${exec.table("audit_files")}
      WHERE engagement_id = $1`,
    [engagementId],
  );

  const files = [];
  for (const file of fileRows) {
    const paperRows = await exec.query<Row>(
      `SELECT working_paper_id, file_id, reference, title, prepared_by, prepared_at
         FROM ${exec.table("working_papers")}
        WHERE file_id = $1`,
      [file.file_id],
    );
    const papers = [];
    for (const paper of paperRows) {
      const checklistRows = await exec.query<Row>(
        `SELECT checklist_id, working_paper_id, standard_number,
                content_pack_id, content_version, content_hash, created_by, created_at
           FROM ${exec.table("review_checklists")}
          WHERE working_paper_id = $1`,
        [paper.working_paper_id],
      );
      papers.push({
        paper: {
          workingPaperId: String(paper.working_paper_id),
          fileId: String(paper.file_id),
          reference: String(paper.reference),
          title: String(paper.title),
          preparedBy: String(paper.prepared_by),
          preparedAt: String(paper.prepared_at),
        },
        checklists: checklistRows.map((row) => ({
          checklistId: String(row.checklist_id),
          workingPaperId: String(row.working_paper_id),
          standardNumber: String(row.standard_number),
          pin: {
            contentPackId: String(row.content_pack_id),
            version: String(row.content_version),
            contentHash: String(row.content_hash),
          },
          createdBy: String(row.created_by),
          createdAt: String(row.created_at),
        })),
      });
    }
    files.push({
      file: {
        fileId: String(file.file_id),
        engagementId: String(file.engagement_id),
        name: String(file.name),
        description: file.description ? String(file.description) : null,
        createdBy: String(file.created_by),
        createdAt: String(file.created_at),
      },
      papers,
    });
  }

  return {
    engagement: {
      engagementId: String(engagement.engagement_id),
      title: String(engagement.title),
      periodStart: String(engagement.period_start),
      periodEnd: String(engagement.period_end),
      status: String(engagement.status) as "completed" | "in_progress",
      createdBy: String(engagement.created_by),
      createdAt: String(engagement.created_at),
    },
    files,
  };
}

async function loadChecklistResults(
  exec: ScopedExecutor,
  hierarchy: EngagementHierarchy,
): Promise<Map<string, import("@eqa/content").ChecklistResult[]>> {
  const checklistIds = hierarchy.files.flatMap((f) =>
    f.papers.flatMap((p) => p.checklists.map((c) => c.checklistId)),
  );
  const results = new Map<string, import("@eqa/content").ChecklistResult[]>();
  for (const checklistId of checklistIds) {
    const rows = await exec.query<Row>(
      `SELECT result_id, checklist_id, checklist_item_id, conformance, note,
              recorded_by, recorded_at
         FROM ${exec.table("checklist_results")}
        WHERE checklist_id = $1`,
      [checklistId],
    );
    results.set(
      checklistId,
      rows.map((row) => ({
        resultId: String(row.result_id),
        checklistId: String(row.checklist_id),
        checklistItemId: String(row.checklist_item_id),
        conformance: String(row.conformance) as
          | "conforms"
          | "does_not_conform"
          | "not_applicable",
        note: row.note ? String(row.note) : null,
        recordedBy: String(row.recorded_by),
        recordedAt: String(row.recorded_at),
      })),
    );
  }
  return results;
}

/**
 * Builds the data-layer loader the mock-EQA job uses to gather tenant-scoped
 * scoring inputs: item statuses, human-reviewed final conclusions, and optional
 * working-paper conformance rollups.
 */
export function createMockEqaScoringLoader(
  db: Database,
  catalog: ContentCatalog = loadBundledCatalog(),
): MockEqaScoringLoader {
  return {
    async loadScoringInput(
      tenant: TenantContext,
      payload: MockEqaSimulationPayload,
    ): Promise<MockEqaScoringInput> {
      const exec = new ScopedExecutor(db, tenant);
      const locale = payload.locale ?? "en";
      const pack = catalog.get(payload.contentPackId, payload.contentVersion);
      const questionnaire = renderQuestionnaire(pack, locale);

      const statusRows = await exec.query<StatusRow>(
        `SELECT question_id, status
           FROM ${exec.table("assessment_item_status")}
          WHERE assessment_id = $1`,
        [payload.assessmentId],
      );
      const statusesByQuestion = new Map<string, ItemStatus>(
        statusRows.map((row) => [
          String(row.question_id),
          String(row.status) as ItemStatus,
        ]),
      );

      const conclusionRows = await exec.query<ConclusionRow>(
        `SELECT assessment_id, question_id, standard_number, conclusion
           FROM ${exec.table("final_conclusions")}
          WHERE assessment_id = $1`,
        [payload.assessmentId],
      );
      const finalConclusions = conclusionRows.map(toFinalConclusion);
      const conformanceByStandard = await loadConformanceByStandard(
        exec,
        catalog,
        payload.engagementId,
      );

      return {
        assessmentId: payload.assessmentId,
        assessmentName: {
          en: payload.assessmentId,
          ar: payload.assessmentId,
        },
        locale,
        questionnaire,
        statusesByQuestion,
        finalConclusions,
        conformanceByStandard,
      };
    },
  };
}

/**
 * Builds the data-layer sink that persists a mock-EQA simulation result.
 * Tenant-scoped, system-audited — the result is always
 * {@link READINESS_SIMULATION_KIND}, never a formal assessment conclusion.
 */
export function createMockEqaSimulationSink(db: Database): MockEqaSimulationSink {
  return {
    async persistSimulation(
      tenant: TenantContext,
      result: MockEqaSimulationResult,
      requestedBy: string,
    ): Promise<MockEqaSimulationResult> {
      assertReadinessSimulation(result);
      const exec = new ScopedExecutor(db, tenant);
      const audit = new AuditLog(
        new TenantAuditStore(exec),
        SYSTEM_MOCK_EQA_ACTOR,
      );

      await exec.query(
        `INSERT INTO ${exec.table("mock_eqa_simulations")}
           (simulation_id, assessment_id, kind, overall_score, overall_level,
            payload_json, run_by, run_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          result.simulationId,
          result.assessmentId,
          READINESS_SIMULATION_KIND,
          result.overall.score,
          result.overall.level,
          JSON.stringify(result),
          requestedBy,
          result.runAt,
        ],
      );

      await audit.append({
        action: "create",
        entity: "mock_eqa_simulation",
        entityId: result.simulationId,
        oldValue: null,
        newValue: {
          kind: result.kind,
          assessmentId: result.assessmentId,
          overallScore: result.overall.score,
          overallLevel: result.overall.level,
          runBy: requestedBy,
          disclaimer: result.disclaimer.shortEn,
        },
      });

      return result;
    },
  };
}

/** Reads the latest persisted simulation for an assessment (tenant-scoped). */
export async function readLatestMockEqaSimulation(
  exec: ScopedExecutor,
  assessmentId: string,
): Promise<MockEqaSimulationResult | null> {
  const rows = await exec.query<SimulationRow>(
    `SELECT simulation_id, assessment_id, kind, overall_score, overall_level,
            payload_json, run_by, run_at
       FROM ${exec.table("mock_eqa_simulations")}
      WHERE assessment_id = $1
      ORDER BY run_at DESC, simulation_id DESC
      LIMIT 1`,
    [assessmentId],
  );
  const row = rows[0];
  return row ? parseSimulationRow(row) : null;
}
