import { loadBundledCatalog } from "@eqa/content";
import { renderQuestionnaire } from "./render";
import type { MockEqaScoringInput } from "./mock-eqa-scoring";
import type { DashboardRole } from "./readiness-dashboard";
import {
  createSeeraDemoAssessmentName,
  createSeeraDemoConformanceByStandard,
  createSeeraDemoFinalConclusions,
  createSeeraDemoStatusesByQuestion,
  SEERA_DEMO_ASSESSMENT_ID,
  SEERA_DEMO_PACK_ID,
  SEERA_DEMO_PACK_VERSION,
  SEERA_DEMO_REFERENCE_DATE,
} from "./synthetic-seera-demo";

/**
 * Synthetic mock-EQA inputs mirroring the Seera-pilot dashboard demo. No real
 * tenant data — used for local UI review and pure scoring tests.
 */
export function createSyntheticMockEqaInput(
  locale: "en" | "ar",
  _role?: DashboardRole,
): MockEqaScoringInput {
  const catalog = loadBundledCatalog();
  const pack = catalog.get(SEERA_DEMO_PACK_ID, SEERA_DEMO_PACK_VERSION);
  const questionnaire = renderQuestionnaire(pack, locale);

  return {
    assessmentId: SEERA_DEMO_ASSESSMENT_ID,
    assessmentName: createSeeraDemoAssessmentName(),
    locale,
    questionnaire,
    statusesByQuestion: createSeeraDemoStatusesByQuestion(),
    finalConclusions: createSeeraDemoFinalConclusions(),
    conformanceByStandard: createSeeraDemoConformanceByStandard(),
    runBy: "demo-user",
    runAt: SEERA_DEMO_REFERENCE_DATE,
    simulationId: "sim-seera-demo",
  };
}
