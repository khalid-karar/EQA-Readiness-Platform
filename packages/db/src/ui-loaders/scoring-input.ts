import type { ContentCatalog, Locale } from "@eqa/content";
import { loadBundledCatalog } from "@eqa/content";
import { renderQuestionnaire } from "@eqa/workflows";
import type { FinalConclusion, ItemStatus, MockEqaScoringInput } from "@eqa/workflows";
import type { StandardConformanceSummary } from "@eqa/workflows";
import { WorkingPaperReviewEngine } from "@eqa/workflows";
import type { TenantRepositories } from "../repositories";
import {
  PILOT_ASSESSMENT_ID,
  PILOT_ASSESSMENT_NAME,
  PILOT_PACK_ID,
  PILOT_PACK_VERSION,
} from "./pilot-assessment";

function statusesMap(
  records: readonly { questionId: string; status: ItemStatus }[],
): Map<string, ItemStatus> {
  return new Map(records.map((r) => [r.questionId, r.status]));
}

/**
 * Builds mock-EQA scoring inputs from tenant repositories (no direct SQL).
 */
export async function loadMockEqaScoringInput(
  repos: TenantRepositories,
  locale: Locale,
  catalog: ContentCatalog = loadBundledCatalog(),
): Promise<MockEqaScoringInput> {
  const assessmentId = PILOT_ASSESSMENT_ID;
  const pack = catalog.get(PILOT_PACK_ID, PILOT_PACK_VERSION);
  const questionnaire = renderQuestionnaire(pack, locale);

  const statusRecords = await repos.itemStatus.getForAssessment(assessmentId);
  const statusesByQuestion = statusesMap(statusRecords);
  const finalConclusions = await repos.humanReview.getForAssessment(assessmentId);

  const engagements = await repos.workingPaperReview.listCompletedEngagements();
  let conformanceByStandard = new Map<string, StandardConformanceSummary>();

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

  return {
    assessmentId,
    assessmentName: PILOT_ASSESSMENT_NAME,
    locale,
    questionnaire,
    statusesByQuestion,
    finalConclusions,
    conformanceByStandard,
  };
}

export async function loadFinalConclusions(
  repos: TenantRepositories,
): Promise<readonly FinalConclusion[]> {
  return repos.humanReview.getForAssessment(PILOT_ASSESSMENT_ID);
}
