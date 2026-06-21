import type { AuthSession } from "@eqa/auth";
import type { Locale } from "@eqa/content";
import { loadBundledCatalog } from "@eqa/content";
import { renderQuestionnaire } from "@eqa/workflows";
import {
  buildDashboardView,
  countRemediationOverdue,
  type DashboardInput,
  type DashboardRole,
  type DashboardView,
  type ItemStatus,
} from "@eqa/workflows";
import { WorkingPaperReviewEngine } from "@eqa/workflows";
import type { Database } from "../database";
import { assertUiSession, uiRepositories } from "./assert-session";
import {
  PILOT_ASSESSMENT_ID,
  PILOT_ASSESSMENT_NAME,
  PILOT_PACK_ID,
  PILOT_PACK_VERSION,
} from "./pilot-assessment";

export interface DashboardLoader {
  loadInput(
    session: AuthSession | null | undefined,
    locale: Locale,
    role: DashboardRole,
  ): Promise<DashboardInput>;
}

export function createDashboardLoader(db: Database): DashboardLoader {
  return {
    async loadInput(session, locale, role) {
      const repos = uiRepositories(db, assertUiSession(session));
      const catalog = loadBundledCatalog();
      const pack = catalog.get(PILOT_PACK_ID, PILOT_PACK_VERSION);
      const questionnaire = renderQuestionnaire(pack, locale);

      const statusRecords = await repos.itemStatus.getForAssessment(
        PILOT_ASSESSMENT_ID,
      );
      const statusesByQuestion = new Map<string, ItemStatus>(
        statusRecords.map((r) => [r.questionId, r.status]),
      );

      const drafts = await repos.draftFindings.getForAssessment(
        PILOT_ASSESSMENT_ID,
      );
      const conclusions = await repos.humanReview.getForAssessment(
        PILOT_ASSESSMENT_ID,
      );
      const concludedQuestions = new Set(conclusions.map((c) => c.questionId));
      const pendingReviewCount = drafts.filter(
        (d) => !concludedQuestions.has(d.questionId),
      ).length;

      const engagements = await repos.workingPaperReview.listCompletedEngagements();
      let conformanceByStandard = new Map(
        [] as [string, import("@eqa/workflows").StandardConformanceSummary][],
      );
      if (engagements.length > 0) {
        const engagementId = engagements[0]!.engagementId;
        const wpEngine = new WorkingPaperReviewEngine(
          repos.workingPaperReview,
          catalog,
        );
        const summary = await wpEngine.getEngagementConformance(engagementId);
        conformanceByStandard = new Map(
          summary.byStandard.map((s) => [s.standardNumber, s]),
        );
      }

      const remediationItems = await repos.remediation.listForAssessment(
        PILOT_ASSESSMENT_ID,
      );
      const remediationOverdueCount = countRemediationOverdue(
        remediationItems,
        statusesByQuestion,
      );

      return {
        assessmentId: PILOT_ASSESSMENT_ID,
        assessmentName: PILOT_ASSESSMENT_NAME,
        locale,
        role,
        questionnaire,
        statusesByQuestion,
        conformanceByStandard,
        pendingReviewCount,
        remediationOverdueCount,
      };
    },
  };
}

/** Convenience: load input and build the workflow dashboard view. */
export async function loadDashboardView(
  db: Database,
  session: AuthSession,
  locale: Locale,
  role: DashboardRole,
): Promise<DashboardView> {
  const input = await createDashboardLoader(db).loadInput(session, locale, role);
  return buildDashboardView(input);
}
