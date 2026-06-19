import { loadBundledCatalog } from "@eqa/content";
import { renderQuestionnaire } from "./render";
import type { DashboardInput } from "./readiness-dashboard";
import type { ItemStatus } from "./state-machine";
import type { StandardConformanceSummary } from "./working-paper-review";

const PACK_ID = "eqa-foundations";
const PACK_VERSION = "1.0.0";

/**
 * Synthetic dashboard inputs for local UI review. No real tenant data — every
 * value is fabricated for the Seera-pilot demo assessment.
 */
export function createSyntheticDashboardInput(
  locale: "en" | "ar",
  role: DashboardInput["role"],
): DashboardInput {
  const catalog = loadBundledCatalog();
  const pack = catalog.get(PACK_ID, PACK_VERSION);
  const questionnaire = renderQuestionnaire(pack, locale);

  const statusesByQuestion = new Map<string, ItemStatus>([
    ["Q-1-1-1", "closed_ready"],
    ["Q-1-1-2", "reviewed_no_gap"],
    ["Q-1-2-1", "gap_confirmed"],
    ["Q-1-2-2", "under_human_review"],
    ["Q-2-1-1", "not_assessed"],
    ["Q-2-1-2", "not_assessed"],
  ]);

  const pin = {
    contentPackId: pack.meta.contentPackId,
    version: pack.meta.version,
    contentHash: pack.contentHash,
  };

  const conformanceByStandard = new Map<string, StandardConformanceSummary>([
    [
      "1.1",
      {
        standardNumber: "1.1",
        pin,
        conforms: 3,
        doesNotConform: 0,
        notApplicable: 0,
        unreviewed: 0,
        totalItems: 3,
      },
    ],
    [
      "1.2",
      {
        standardNumber: "1.2",
        pin,
        conforms: 1,
        doesNotConform: 1,
        notApplicable: 0,
        unreviewed: 1,
        totalItems: 3,
      },
    ],
    [
      "2.1",
      {
        standardNumber: "2.1",
        pin,
        conforms: 0,
        doesNotConform: 0,
        notApplicable: 0,
        unreviewed: 3,
        totalItems: 3,
      },
    ],
  ]);

  return {
    assessmentId: "assessment-seera-2026",
    assessmentName: {
      en: "Seera-pilot EQA Foundations Assessment 2026",
      ar: "تقييم أسس EQA التجريبي — سيرة 2026",
    },
    locale,
    role,
    questionnaire,
    statusesByQuestion,
    conformanceByStandard,
    pendingReviewCount: 1,
  };
}
