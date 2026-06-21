import { loadBundledCatalog } from "@eqa/content";
import { renderQuestionnaire } from "./render";
import type { DashboardInput } from "./readiness-dashboard";
import { countRemediationOverdue } from "./remediation";
import {
  createSeeraDemoAssessmentName,
  createSeeraDemoConformanceByStandard,
  createSeeraDemoRemediationItems,
  createSeeraDemoStatusesByQuestion,
  SEERA_DEMO_ASSESSMENT_ID,
  SEERA_DEMO_PACK_ID,
  SEERA_DEMO_PACK_VERSION,
  SEERA_DEMO_PENDING_REVIEW_COUNT,
  SEERA_DEMO_REFERENCE_DATE,
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

  const statusesByQuestion = createSeeraDemoStatusesByQuestion();

  return {
    assessmentId: SEERA_DEMO_ASSESSMENT_ID,
    assessmentName: createSeeraDemoAssessmentName(),
    locale,
    role,
    questionnaire,
    statusesByQuestion,
    conformanceByStandard: createSeeraDemoConformanceByStandard(),
    pendingReviewCount: SEERA_DEMO_PENDING_REVIEW_COUNT,
    remediationOverdueCount: countRemediationOverdue(
      createSeeraDemoRemediationItems(locale),
      statusesByQuestion,
      SEERA_DEMO_REFERENCE_DATE,
    ),
  };
}
