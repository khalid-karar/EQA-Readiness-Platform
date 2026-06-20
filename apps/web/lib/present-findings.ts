import type { Locale } from "@eqa/content";
import type { DraftFinding } from "@eqa/workflows";
import {
  createSeeraDemoAssessmentName,
  createSeeraDemoDraftFindings,
  createSeeraDemoFinalConclusions,
  ROLE_LABELS,
  SEERA_DEMO_PACK_ID,
  SEERA_DEMO_PACK_VERSION,
  SEERA_DEMO_REFERENCE_DATE,
  renderQuestionnaire,
  type DashboardRole,
} from "@eqa/workflows";
import { loadBundledCatalog } from "@eqa/content";

export type PresentedFindingStatus = "pending_review" | "gap_confirmed" | "no_gap";

export interface PresentedFinding {
  readonly id: string;
  readonly findingId: string;
  readonly standardNumber: string;
  readonly standardTitle: string;
  readonly questionId: string;
  readonly status: PresentedFindingStatus;
  readonly statusLabelEn: string;
  readonly statusLabelAr: string;
  readonly source: "ai" | "human";
  readonly sourceLabelEn: string;
  readonly sourceLabelAr: string;
  readonly ageDays: number;
  readonly ageLabelEn: string;
  readonly ageLabelAr: string;
  readonly draft?: DraftFinding;
  readonly conclusionText?: string;
  readonly resolved: boolean;
}

export interface FindingsPresentation {
  readonly assessmentName: string;
  readonly locale: Locale;
  readonly role: DashboardRole;
  readonly roleLabel: string;
  readonly isSummaryView: boolean;
  readonly canReview: boolean;
  readonly findings: readonly PresentedFinding[];
}

function ageDaysFrom(
  timestamp: string,
  referenceIso = SEERA_DEMO_REFERENCE_DATE,
): number {
  const ref = new Date(referenceIso).getTime();
  const ts = new Date(timestamp).getTime();
  return Math.max(0, Math.floor((ref - ts) / 86_400_000));
}

function ageLabel(days: number, locale: Locale): string {
  if (locale === "ar") {
    return days === 0 ? "اليوم" : days === 1 ? "يوم واحد" : `${days} يوم`;
  }
  return days === 0 ? "Today" : days === 1 ? "1 day" : `${days} days`;
}

function standardTitleFor(
  standardNumber: string,
  locale: Locale,
): string {
  const catalog = loadBundledCatalog();
  const pack = catalog.get(SEERA_DEMO_PACK_ID, SEERA_DEMO_PACK_VERSION);
  const questionnaire = renderQuestionnaire(pack, locale);
  for (const domain of questionnaire.domains) {
    for (const principle of domain.principles) {
      for (const standard of principle.standards) {
        if (standard.number === standardNumber) return standard.title;
      }
    }
  }
  return standardNumber;
}

function presentDraft(
  draft: DraftFinding,
  locale: Locale,
): PresentedFinding {
  const ageDays = ageDaysFrom(draft.provenance.timestamp);
  return {
    id: draft.findingId ?? draft.questionId,
    findingId: draft.findingId ?? draft.questionId,
    standardNumber: draft.standardNumber,
    standardTitle: standardTitleFor(draft.standardNumber, locale),
    questionId: draft.questionId,
    status: "pending_review",
    statusLabelEn: "Pending review",
    statusLabelAr: "بانتظار المراجعة",
    source: "ai",
    sourceLabelEn: "AI draft",
    sourceLabelAr: "مسودة الذكاء الاصطناعي",
    ageDays,
    ageLabelEn: ageLabel(ageDays, "en"),
    ageLabelAr: ageLabel(ageDays, "ar"),
    draft,
    resolved: false,
  };
}

export function buildFindingsPresentation(
  locale: Locale,
  role: DashboardRole,
): FindingsPresentation {
  const assessmentName = createSeeraDemoAssessmentName()[locale];
  const isSummaryView = role === "board";
  const canReview = !isSummaryView;

  const pending = createSeeraDemoDraftFindings(locale).map((d) =>
    presentDraft(d, locale),
  );

  const resolved: PresentedFinding[] = createSeeraDemoFinalConclusions().map(
    (fc) => {
      const ageDays = ageDaysFrom("2026-06-15T10:00:00.000Z");
      return {
        id: `final-${fc.questionId}`,
        findingId: `final-${fc.questionId}`,
        standardNumber: fc.standardNumber,
        standardTitle: standardTitleFor(fc.standardNumber, locale),
        questionId: fc.questionId,
        status: "gap_confirmed",
        statusLabelEn: "Gap confirmed",
        statusLabelAr: "فجوة مؤكدة",
        source: "human",
        sourceLabelEn: "Human review",
        sourceLabelAr: "مراجعة بشرية",
        ageDays,
        ageLabelEn: ageLabel(ageDays, "en"),
        ageLabelAr: ageLabel(ageDays, "ar"),
        conclusionText: fc.conclusion,
        resolved: true,
      };
    },
  );

  return {
    assessmentName,
    locale,
    role,
    roleLabel: ROLE_LABELS[role][locale],
    isSummaryView,
    canReview,
    findings: [...pending, ...resolved],
  };
}
