import { loadBundledCatalog } from "@eqa/content";
import { renderQuestionnaire } from "./render";
import {
  buildRemediationTrackerView,
  type RemediationItem,
} from "./remediation";
import type { ItemStatus } from "./state-machine";

const ASSESSMENT_ID = "assessment-seera-2026";

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

  const items: RemediationItem[] = [
    {
      remediationId: "rem-1",
      assessmentId: ASSESSMENT_ID,
      questionId: "Q-1-2-1",
      standardNumber: "1.2",
      action:
        locale === "ar"
          ? "تحديث إجراء إقرار تضارب المصالح وتوثيق المراجعات"
          : "Update conflict-of-interest declaration process and document reviews",
      owner: locale === "ar" ? "مدير التدقيق" : "Audit Manager",
      targetDate: "2026-05-15",
      createdBy: "synthetic",
      createdAt: "2026-04-01T10:00:00.000Z",
      updatedBy: "synthetic",
      updatedAt: "2026-04-10T10:00:00.000Z",
      closedAt: null,
      retestNote: null,
    },
    {
      remediationId: "rem-2",
      assessmentId: ASSESSMENT_ID,
      questionId: "Q-2-1-1",
      standardNumber: "2.1",
      action:
        locale === "ar"
          ? "تقديم محاضر المجلس المعتمدة لخط التبعية الوظيفي"
          : "Provide board-approved minutes evidencing functional reporting line",
      owner:
        locale === "ar" ? "الرئيس التنفيذي للتدقيق" : "Chief Audit Executive",
      targetDate: "2026-08-01",
      createdBy: "synthetic",
      createdAt: "2026-05-01T10:00:00.000Z",
      updatedBy: "synthetic",
      updatedAt: "2026-05-20T10:00:00.000Z",
      closedAt: null,
      retestNote: null,
    },
    {
      remediationId: "rem-3",
      assessmentId: ASSESSMENT_ID,
      questionId: "Q-1-1-1",
      standardNumber: "1.1",
      action:
        locale === "ar"
          ? "أرشفة إقرارات الميثاق الأخلاقي المحدَّثة"
          : "Archive updated ethics charter acknowledgements",
      owner: locale === "ar" ? "محلل التدقيق" : "Audit Analyst",
      targetDate: "2026-03-01",
      createdBy: "synthetic",
      createdAt: "2026-02-01T10:00:00.000Z",
      updatedBy: "synthetic",
      updatedAt: "2026-03-15T10:00:00.000Z",
      closedAt: "2026-04-01T10:00:00.000Z",
      retestNote: null,
    },
  ];

  const statusesByQuestion = new Map<string, ItemStatus>([
    ["Q-1-2-1", "remediation_in_progress"],
    ["Q-2-1-1", "ready_for_retest"],
    ["Q-1-1-1", "closed_ready"],
  ]);

  return buildRemediationTrackerView({
    assessmentId: ASSESSMENT_ID,
    assessmentName: {
      en: "Seera-pilot EQA Foundations Assessment 2026",
      ar: "تقييم أسس EQA التجريبي — سيرة 2026",
    },
    locale,
    role,
    items,
    statusesByQuestion,
    standardTitles,
    referenceDate: "2026-06-19T12:00:00.000Z",
  });
}
