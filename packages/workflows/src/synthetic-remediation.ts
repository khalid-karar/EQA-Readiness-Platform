import { loadBundledCatalog } from "@eqa/content";
import { renderQuestionnaire } from "./render";
import {
  buildRemediationTrackerView,
  type RemediationItem,
} from "./remediation";
import type { ItemStatus } from "./state-machine";
import {
  createSeeraDemoAssessmentName,
  createSeeraDemoRemediationItems,
  SEERA_DEMO_ASSESSMENT_ID,
  SEERA_DEMO_QUESTIONS,
  SEERA_DEMO_REFERENCE_DATE,
} from "./synthetic-seera-demo";

/**
 * Synthetic remediation tracker data for local UI review. No real tenant data.
 */
export function createSyntheticRemediationView(
  locale: "en" | "ar",
  role: "cae" | "audit_staff" | "board",
) {
  const catalog = loadBundledCatalog();
  const pack = catalog.get("eqa-foundations", "1.0.0");
  const questionnaire = renderQuestionnaire(pack, locale);

  const standardTitles = new Map<string, string>();
  for (const domain of questionnaire.domains) {
    for (const principle of domain.principles) {
      for (const standard of principle.standards) {
        standardTitles.set(standard.number, standard.title);
      }
    }
  }

  const items: RemediationItem[] = createSeeraDemoRemediationItems(locale);

  const statusesByQuestion = new Map<string, ItemStatus>([
    [SEERA_DEMO_QUESTIONS.ETHICS_CHARTER, "closed_ready"],
    [SEERA_DEMO_QUESTIONS.OBJECTIVITY_THREATS, "remediation_in_progress"],
  ]);

  return buildRemediationTrackerView({
    assessmentId: SEERA_DEMO_ASSESSMENT_ID,
    assessmentName: createSeeraDemoAssessmentName(),
    locale,
    role,
    items,
    statusesByQuestion,
    standardTitles,
    referenceDate: SEERA_DEMO_REFERENCE_DATE,
  });
}
