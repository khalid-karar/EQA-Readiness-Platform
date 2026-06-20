import { loadBundledCatalog } from "@eqa/content";
import { renderQuestionnaire } from "./render";
import type { EvidencePackAssemblyInput } from "./evidence-pack";
import type { ItemStatus } from "./state-machine";
import { createSyntheticMockEqaInput } from "./synthetic-mock-eqa";
import {
  createSeeraDemoAssessmentName,
  createSeeraDemoEvidenceMetadata,
  createSeeraDemoFinalConclusions,
  createSeeraDemoRemediationItems,
  createSeeraDemoResponses,
  createSeeraDemoStatusesByQuestion,
  SEERA_DEMO_ASSESSMENT_ID,
  SEERA_DEMO_REFERENCE_DATE,
} from "./synthetic-seera-demo";

/**
 * Synthetic evidence pack inputs for local UI review and tests. No real tenant
 * data — mirrors the non-trivial Seera-pilot demo assessment.
 */
export function createSyntheticEvidencePackInput(
  locale: "en" | "ar",
): EvidencePackAssemblyInput {
  const mockInput = createSyntheticMockEqaInput(locale);
  const catalog = loadBundledCatalog();
  const pack = catalog.get("eqa-foundations", "1.0.0");
  const questionnaire = renderQuestionnaire(pack, locale);

  return {
    assessmentId: SEERA_DEMO_ASSESSMENT_ID,
    assessmentName: createSeeraDemoAssessmentName(),
    locale,
    questionnaire,
    statusesByQuestion: createSeeraDemoStatusesByQuestion(),
    responses: createSeeraDemoResponses(locale),
    finalConclusions: createSeeraDemoFinalConclusions(),
    remediationItems: createSeeraDemoRemediationItems(locale),
    evidenceMetadata: createSeeraDemoEvidenceMetadata(),
    readinessInput: mockInput,
    exportId: "pack-seera-demo",
    generatedAt: SEERA_DEMO_REFERENCE_DATE,
    generatedBy: "demo-user",
  };
}

export function createSyntheticEvidencePackInputMinimal(
  locale: "en" | "ar" = "en",
): EvidencePackAssemblyInput {
  const input = createSyntheticEvidencePackInput(locale);
  return {
    ...input,
    evidenceMetadata: [],
    remediationItems: [],
    finalConclusions: [],
    statusesByQuestion: new Map<string, ItemStatus>([
      ["Q-1-1-1", "closed_ready"],
    ]),
  };
}
