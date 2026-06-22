import type { AuthSession } from "@eqa/auth";
import type { Locale } from "@eqa/content";
import { loadBundledCatalog } from "@eqa/content";
import { renderQuestionnaire } from "@eqa/workflows";
import type {
  DashboardRole,
  EvidencePackAssemblyInput,
  EvidencePackManifest,
  FinalConclusion,
  ItemStatus,
  RemediationItem,
} from "@eqa/workflows";
import { loadAssessmentContext } from "../active-assessment";
import type { Database } from "../database";
import { assertUiSession, uiRepositories } from "./assert-session";
import { PILOT_PACK_ID, PILOT_PACK_VERSION } from "./pilot-assessment";
import { loadMockEqaScoringInput } from "./scoring-input";

export interface EvidencePackLoadResult {
  readonly locale: Locale;
  readonly role: DashboardRole;
  readonly assemblyInput: EvidencePackAssemblyInput;
  readonly persistedManifest: EvidencePackManifest | null;
}

export interface EvidencePackLoader {
  load(
    session: AuthSession | null | undefined,
    locale: Locale,
    role: DashboardRole,
  ): Promise<EvidencePackLoadResult>;
}

export function createEvidencePackLoader(db: Database): EvidencePackLoader {
  return {
    async load(session, locale, role) {
      const repos = uiRepositories(db, assertUiSession(session));
      const { assessmentId, assessmentName } = await loadAssessmentContext(repos);
      const catalog = loadBundledCatalog();
      const pack = catalog.get(PILOT_PACK_ID, PILOT_PACK_VERSION);
      const questionnaire = renderQuestionnaire(pack, locale);

      const statusRecords = await repos.itemStatus.getForAssessment(
        assessmentId,
      );
      const statusesByQuestion = new Map<string, ItemStatus>(
        statusRecords.map((r) => [r.questionId, r.status]),
      );

      const responses = await repos.responses.getForAssessment(
        assessmentId,
      );
      const conclusions: FinalConclusion[] =
        await repos.humanReview.getForAssessment(assessmentId);
      const remediationItems: RemediationItem[] =
        await repos.remediation.listForAssessment(assessmentId);

      const evidenceRows = await repos.evidence.list();
      const evidenceMetadata = evidenceRows.map((row) => ({
        evidenceId: row.evidenceId,
        version: row.version,
        fileName: row.fileName,
        contentType: row.contentType,
        sizeBytes: row.sizeBytes,
        links: row.links,
        scanStatus: row.scanStatus,
        uploadedAt: row.uploadedAt,
      }));

      const readinessInput = await loadMockEqaScoringInput(
        repos,
        locale,
        catalog,
      );
      const exportRecord = await repos.evidencePack.getLatest(
        assessmentId,
      );

      const assemblyInput: EvidencePackAssemblyInput = {
        assessmentId,
        assessmentName,
        locale,
        questionnaire,
        statusesByQuestion,
        responses,
        finalConclusions: conclusions,
        remediationItems,
        evidenceMetadata,
        readinessInput,
        exportId: exportRecord?.exportId ?? "preview",
        generatedAt: exportRecord?.manifest.generatedAt ?? new Date().toISOString(),
        generatedBy: exportRecord?.manifest.generatedBy ?? "ui-preview",
      };

      return {
        locale,
        role,
        assemblyInput,
        persistedManifest: exportRecord?.manifest ?? null,
      };
    },
  };
}
