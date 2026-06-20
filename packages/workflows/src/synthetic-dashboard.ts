import { loadBundledCatalog } from "@eqa/content";
import { renderQuestionnaire } from "./render";
import type { DashboardInput } from "./readiness-dashboard";
import {
  createSeeraDemoAssessmentName,
  createSeeraDemoConformanceByStandard,
  createSeeraDemoStatusesByQuestion,
  SEERA_DEMO_ASSESSMENT_ID,
  SEERA_DEMO_PACK_ID,
  SEERA_DEMO_PACK_VERSION,
  SEERA_DEMO_PENDING_REVIEW_COUNT,
} from "./synthetic-seera-demo";

/**
 * Synthetic dashboard inputs for local UI review. No real tenant data — every
 * value is fabricated for the Seera-pilot demo assessment.
 */
export function createSyntheticDashboardInput(
  locale: "en" | "ar",
  role: DashboardInput["role"],
): DashboardInput {
  const catalog = loadBundledCatalog();
  const pack = catalog.get(SEERA_DEMO_PACK_ID, SEERA_DEMO_PACK_VERSION);
  const questionnaire = renderQuestionnaire(pack, locale);

  return {
    assessmentId: SEERA_DEMO_ASSESSMENT_ID,
    assessmentName: createSeeraDemoAssessmentName(),
    locale,
    role,
    questionnaire,
    statusesByQuestion: createSeeraDemoStatusesByQuestion(),
    conformanceByStandard: createSeeraDemoConformanceByStandard(),
    pendingReviewCount: SEERA_DEMO_PENDING_REVIEW_COUNT,
  };
}
