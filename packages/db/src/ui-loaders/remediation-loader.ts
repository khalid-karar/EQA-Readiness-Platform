import type { AuthSession } from "@eqa/auth";
import type { Locale } from "@eqa/content";
import { loadBundledCatalog } from "@eqa/content";
import { renderQuestionnaire } from "@eqa/workflows";
import {
  buildRemediationTrackerView,
  type BuildRemediationTrackerInput,
  type DashboardRole,
  type EvidenceMetadataForPack,
  type ItemStatus,
  type RemediationItem,
  type RemediationTrackerView,
} from "@eqa/workflows";
import type { Database } from "../database";
import { assertUiSession, uiRepositories } from "./assert-session";
import {
  PILOT_ASSESSMENT_ID,
  PILOT_ASSESSMENT_NAME,
  PILOT_PACK_ID,
  PILOT_PACK_VERSION,
} from "./pilot-assessment";

export interface RemediationWorkspaceLoadResult {
  readonly view: RemediationTrackerView;
  readonly items: readonly RemediationItem[];
  readonly evidenceItems: readonly EvidenceMetadataForPack[];
}

export interface RemediationLoader {
  loadTrackerInput(
    session: AuthSession | null | undefined,
    locale: Locale,
    role: DashboardRole,
  ): Promise<BuildRemediationTrackerInput>;
  loadTrackerView(
    session: AuthSession | null | undefined,
    locale: Locale,
    role: DashboardRole,
  ): Promise<RemediationTrackerView>;
  loadWorkspace(
    session: AuthSession | null | undefined,
    locale: Locale,
    role: DashboardRole,
  ): Promise<RemediationWorkspaceLoadResult>;
}

export function createRemediationLoader(db: Database): RemediationLoader {
  return {
    async loadTrackerInput(session, locale, role) {
      const repos = uiRepositories(db, assertUiSession(session));
      const catalog = loadBundledCatalog();
      const pack = catalog.get(PILOT_PACK_ID, PILOT_PACK_VERSION);
      const questionnaire = renderQuestionnaire(pack, locale);

      const standardTitles = new Map<string, string>();
      for (const domain of questionnaire.domains) {
        for (const principle of domain.principles) {
          for (const standard of principle.standards) {
            standardTitles.set(standard.number, standard.title);
          }
        }
      }

      const items: RemediationItem[] = await repos.remediation.listForAssessment(
        PILOT_ASSESSMENT_ID,
      );
      const statusRecords = await repos.itemStatus.getForAssessment(
        PILOT_ASSESSMENT_ID,
      );
      const statusesByQuestion = new Map<string, ItemStatus>(
        statusRecords.map((r) => [r.questionId, r.status]),
      );

      return {
        assessmentId: PILOT_ASSESSMENT_ID,
        assessmentName: PILOT_ASSESSMENT_NAME,
        locale,
        role,
        items,
        statusesByQuestion,
        standardTitles,
      };
    },

    async loadTrackerView(session, locale, role) {
      const input = await this.loadTrackerInput(session, locale, role);
      return buildRemediationTrackerView(input);
    },

    async loadWorkspace(session, locale, role) {
      const input = await this.loadTrackerInput(session, locale, role);
      const repos = uiRepositories(db, assertUiSession(session));
      const evidenceRows = await repos.evidence.list();
      return {
        view: buildRemediationTrackerView(input),
        items: input.items,
        evidenceItems: evidenceRows.map((row) => ({
          evidenceId: row.evidenceId,
          version: row.version,
          fileName: row.fileName,
          contentType: row.contentType,
          sizeBytes: row.sizeBytes,
          links: row.links,
          scanStatus: row.scanStatus,
          uploadedAt: row.uploadedAt,
        })),
      };
    },
  };
}
