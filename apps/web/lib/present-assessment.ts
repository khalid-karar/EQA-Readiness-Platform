import { loadBundledCatalog, type Locale } from "@eqa/content";
import type { ItemStatus } from "@eqa/workflows";
import {
  createSeeraDemoAssessmentName,
  createSeeraDemoContentPin,
  createSeeraDemoResponses,
  createSeeraDemoStatusesByQuestion,
  renderQuestionnaire,
  ROLE_LABELS,
  SEERA_DEMO_PACK_ID,
  SEERA_DEMO_PACK_VERSION,
  SEERA_DEMO_QUESTIONS,
  UX_STATUS_LABELS,
  type AssessmentResponse,
  type DashboardRole,
  type ResponsePin,
} from "@eqa/workflows";

export interface ResponseHistoryEntry {
  readonly respondedAt: string;
  readonly answer: string;
  readonly note: string | null;
  readonly pinVersion: string;
  readonly pinHashPrefix: string;
  readonly respondedBy: string;
  readonly labelEn: string;
  readonly labelAr: string;
}

export interface PresentedAssessmentQuestion {
  readonly questionId: string;
  readonly questionText: string;
  readonly status: ItemStatus;
  readonly statusLabelEn: string;
  readonly statusLabelAr: string;
  readonly answer: string | null;
  readonly note: string | null;
  readonly respondedAt: string | null;
  readonly respondedBy: string | null;
  readonly pinPackId: string;
  readonly pinVersion: string;
  readonly pinHash: string;
  readonly pinLabelEn: string;
  readonly pinLabelAr: string;
  readonly history: readonly ResponseHistoryEntry[];
  readonly rubric: readonly {
    readonly level: number;
    readonly label: string;
    readonly descriptor: string;
  }[];
}

export interface PresentedAssessmentStandard {
  readonly id: string;
  readonly standardNumber: string;
  readonly standardTitle: string;
  readonly domainNumber: string;
  readonly domainTitle: string;
  readonly status: ItemStatus;
  readonly statusLabelEn: string;
  readonly statusLabelAr: string;
  readonly pinLabelEn: string;
  readonly pinLabelAr: string;
  readonly questions: readonly PresentedAssessmentQuestion[];
}

export interface AssessmentPresentation {
  readonly assessmentName: string;
  readonly locale: Locale;
  readonly role: DashboardRole;
  readonly roleLabel: string;
  readonly isSummaryView: boolean;
  readonly contentPackLabelEn: string;
  readonly contentPackLabelAr: string;
  readonly standards: readonly PresentedAssessmentStandard[];
  readonly startedCount: number;
  readonly totalStandards: number;
}

const STATUS_PRIORITY: readonly ItemStatus[] = [
  "gap_confirmed",
  "remediation_in_progress",
  "under_human_review",
  "ai_flagged",
  "ready_for_retest",
  "evidence_submitted",
  "evidence_requested",
  "not_assessed",
  "reviewed_no_gap",
  "closed_ready",
  "not_applicable",
];

function worstStatus(statuses: readonly ItemStatus[]): ItemStatus {
  for (const status of STATUS_PRIORITY) {
    if (statuses.includes(status)) return status;
  }
  return "not_assessed";
}

function formatPinLabel(pin: ResponsePin, locale: Locale): string {
  const hash = pin.contentHash.slice(0, 8);
  if (locale === "ar") {
    return `${pin.contentPackId} · ${pin.version} · ${hash}…`;
  }
  return `${pin.contentPackId} v${pin.version} · ${hash}…`;
}

function syntheticHistory(
  questionId: string,
  locale: Locale,
  pin: ResponsePin,
): ResponseHistoryEntry[] {
  const labelEn = "Previous response";
  const labelAr = "إجابة سابقة";

  if (questionId === SEERA_DEMO_QUESTIONS.COI_DECLARATIONS) {
    return [
      {
        respondedAt: "2026-04-15T10:00:00.000Z",
        answer: "2",
        note:
          locale === "ar" ? "تقييم ذاتي أولي" : "Initial self-rating before evidence review",
        pinVersion: pin.version,
        pinHashPrefix: pin.contentHash.slice(0, 8),
        respondedBy: "audit-analyst",
        labelEn,
        labelAr,
      },
    ];
  }

  if (questionId === SEERA_DEMO_QUESTIONS.ETHICS_CHARTER) {
    return [
      {
        respondedAt: "2026-04-01T10:00:00.000Z",
        answer: "3",
        note: null,
        pinVersion: pin.version,
        pinHashPrefix: pin.contentHash.slice(0, 8),
        respondedBy: "audit-analyst",
        labelEn,
        labelAr,
      },
    ];
  }

  if (questionId === SEERA_DEMO_QUESTIONS.FUNCTIONAL_REPORTING) {
    return [
      {
        respondedAt: "2026-03-20T10:00:00.000Z",
        answer: "2",
        note:
          locale === "ar" ? "قبل تحديث المحاضر" : "Before board minutes were compiled",
        pinVersion: pin.version,
        pinHashPrefix: pin.contentHash.slice(0, 8),
        respondedBy: "audit-staff",
        labelEn,
        labelAr,
      },
    ];
  }

  return [];
}

function presentQuestion(
  questionId: string,
  questionText: string,
  status: ItemStatus,
  response: AssessmentResponse | undefined,
  pin: ResponsePin,
  locale: Locale,
  rubric: PresentedAssessmentQuestion["rubric"],
): PresentedAssessmentQuestion {
  const ux = UX_STATUS_LABELS[status];
  return {
    questionId,
    questionText,
    status,
    statusLabelEn: ux.en,
    statusLabelAr: ux.ar,
    answer: response?.answer ?? null,
    note: response?.note ?? null,
    respondedAt: response?.respondedAt ?? null,
    respondedBy: response?.respondedBy ?? null,
    pinPackId: pin.contentPackId,
    pinVersion: pin.version,
    pinHash: pin.contentHash,
    pinLabelEn: formatPinLabel(pin, "en"),
    pinLabelAr: formatPinLabel(pin, "ar"),
    history: syntheticHistory(questionId, locale, pin),
    rubric,
  };
}

export function buildAssessmentPresentation(
  locale: Locale,
  role: DashboardRole,
): AssessmentPresentation {
  const catalog = loadBundledCatalog();
  const pack = catalog.get(SEERA_DEMO_PACK_ID, SEERA_DEMO_PACK_VERSION);
  const questionnaire = renderQuestionnaire(pack, locale);
  const statuses = createSeeraDemoStatusesByQuestion();
  const responses = createSeeraDemoResponses(locale);
  const responseByQuestion = new Map(
    responses.map((r) => [r.questionId, r]),
  );
  const pin = createSeeraDemoContentPin();
  const isSummaryView = role === "board";

  const standards: PresentedAssessmentStandard[] = [];

  for (const domain of questionnaire.domains) {
    for (const principle of domain.principles) {
      for (const standard of principle.standards) {
        const questions: PresentedAssessmentQuestion[] = standard.questions.map(
          (q) =>
            presentQuestion(
              q.questionId,
              q.text,
              statuses.get(q.questionId) ?? "not_assessed",
              responseByQuestion.get(q.questionId),
              pin,
              locale,
              standard.rubric.map((r) => ({
                level: r.level,
                label: r.label,
                descriptor: r.descriptor,
              })),
            ),
        );

        const questionStatuses = questions.map((q) => q.status);
        const aggregate = worstStatus(questionStatuses);
        const ux = UX_STATUS_LABELS[aggregate];

        standards.push({
          id: standard.number,
          standardNumber: standard.number,
          standardTitle: standard.title,
          domainNumber: domain.number,
          domainTitle: domain.title,
          status: aggregate,
          statusLabelEn: ux.en,
          statusLabelAr: ux.ar,
          pinLabelEn: formatPinLabel(pin, "en"),
          pinLabelAr: formatPinLabel(pin, "ar"),
          questions,
        });
      }
    }
  }

  const startedCount = standards.filter((s) =>
    s.questions.some((q) => q.status !== "not_assessed"),
  ).length;

  return {
    assessmentName: createSeeraDemoAssessmentName()[locale],
    locale,
    role,
    roleLabel: ROLE_LABELS[role][locale],
    isSummaryView,
    contentPackLabelEn: `${pack.meta.contentPackId} v${pack.meta.version}`,
    contentPackLabelAr: `${pack.meta.contentPackId} · ${pack.meta.version}`,
    standards,
    startedCount,
    totalStandards: standards.length,
  };
}
