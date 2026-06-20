import { loadBundledCatalog, type ContentPin } from "@eqa/content";
import type { DraftFinding } from "./findings";
import type { AssessmentResponse } from "./types";
import type { FinalConclusion } from "./findings";
import type { RemediationItem } from "./remediation";
import type { ItemStatus } from "./state-machine";
import type { StandardConformanceSummary } from "./working-paper-review";
import type { EvidenceMetadataForPack } from "./evidence-pack";

/** Bundled content pack used by every Seera-pilot synthetic fixture. */
export const SEERA_DEMO_PACK_ID = "eqa-foundations";
export const SEERA_DEMO_PACK_VERSION = "1.0.0";
export const SEERA_DEMO_ASSESSMENT_ID = "assessment-seera-2026";
export const SEERA_DEMO_REFERENCE_DATE = "2026-06-19T12:00:00.000Z";

/** Canonical question IDs exercised across Step 17 and sample-pack fixtures. */
export const SEERA_DEMO_QUESTIONS = {
  ETHICS_CHARTER: "Q-1-1-1",
  ETHICS_ACK: "Q-1-1-2",
  OBJECTIVITY_THREATS: "Q-1-2-1",
  COI_DECLARATIONS: "Q-1-2-2",
  FUNCTIONAL_REPORTING: "Q-2-1-1",
  BUDGET_INDEPENDENCE: "Q-2-1-2",
} as const;

/** Standards spanning principles 1 and 2 (multi-principle / domain-I coverage). */
export const SEERA_DEMO_STANDARDS = {
  ETHICS: "1.1",
  OBJECTIVITY: "1.2",
  ORG_INDEPENDENCE: "2.1",
} as const;

export const SEERA_DEMO_RETEST_FAIL_NOTE =
  "Synthetic failed retest — evidence incomplete";

/** Journey map: mock-EQA checkpoint stays not-started until a simulation is run. */
export const SEERA_DEMO_JOURNEY_MOCK_EQA_STARTED = false;

/** Journey map: evidence-pack checkpoint stays not-started until a pack is generated. */
export const SEERA_DEMO_JOURNEY_PACK_STARTED = false;

export function createSeeraDemoAssessmentName(): {
  readonly en: string;
  readonly ar: string;
} {
  return {
    en: "Seera-pilot EQA Foundations Assessment 2026",
    ar: "تقييم أسس EQA التجريبي — سيرة 2026",
  };
}

export function createSeeraDemoContentPin(): ContentPin {
  const catalog = loadBundledCatalog();
  const pack = catalog.get(SEERA_DEMO_PACK_ID, SEERA_DEMO_PACK_VERSION);
  return {
    assessmentId: SEERA_DEMO_ASSESSMENT_ID,
    contentPackId: pack.meta.contentPackId,
    version: pack.meta.version,
    contentHash: pack.contentHash,
  };
}

/**
 * Non-trivial readiness statuses: confirmed gaps, pending human review,
 * closed-after-retest-loop, and principle-2 evidence in flight.
 */
export function createSeeraDemoStatusesByQuestion(): Map<string, ItemStatus> {
  return new Map<string, ItemStatus>([
    [SEERA_DEMO_QUESTIONS.ETHICS_CHARTER, "closed_ready"],
    [SEERA_DEMO_QUESTIONS.ETHICS_ACK, "reviewed_no_gap"],
    [SEERA_DEMO_QUESTIONS.OBJECTIVITY_THREATS, "gap_confirmed"],
    [SEERA_DEMO_QUESTIONS.COI_DECLARATIONS, "under_human_review"],
    [SEERA_DEMO_QUESTIONS.FUNCTIONAL_REPORTING, "evidence_submitted"],
    [SEERA_DEMO_QUESTIONS.BUDGET_INDEPENDENCE, "not_applicable"],
  ]);
}

function draftProvenance(
  output: string,
  timestamp: string,
): DraftFinding["provenance"] {
  return {
    promptVersion: "gap-flag@1.0.0",
    rubricVersion: "1.0.0",
    modelAdapter: "local-stub",
    adapterLocation: "local",
    inputSummary: "excerpts=2; redacted=yes",
    output,
    timestamp,
  };
}

/** AI drafts pending human review — surfaced on findings and dashboard pending actions. */
export function createSeeraDemoDraftFindings(
  locale: "en" | "ar",
): DraftFinding[] {
  const pin = createSeeraDemoContentPin();

  const coiSummary =
    locale === "ar"
      ? "مسودة: إقرارات تضارب المصالح غير مكتملة لثلاثة أعضاء مجلس الإدارة."
      : "DRAFT: Conflict-of-interest declarations incomplete for three board members.";

  const budgetSummary =
    locale === "ar"
      ? "مسودة: لا يوجد دليل على استقلالية الميزانية في أوراق العمل المراجَعة."
      : "DRAFT: No evidence of budget independence in reviewed working papers.";

  const ethicsSummary =
    locale === "ar"
      ? "مسودة: فجوة محتملة في توثيق ميثاق الأخلاق — يتطلب مراجعة بشرية."
      : "DRAFT: Potential gap in ethics charter documentation — requires human review.";

  return [
    {
      kind: "draft_finding",
      status: "draft",
      findingId: "finding-coi-review",
      assessmentId: SEERA_DEMO_ASSESSMENT_ID,
      questionId: SEERA_DEMO_QUESTIONS.COI_DECLARATIONS,
      standardNumber: SEERA_DEMO_STANDARDS.OBJECTIVITY,
      draftSummary: coiSummary,
      provenance: draftProvenance(coiSummary, "2026-06-10T10:00:00.000Z"),
      contentPin: pin,
      requiresHumanReview: true,
    },
    {
      kind: "draft_finding",
      status: "draft",
      findingId: "finding-budget-wp",
      assessmentId: SEERA_DEMO_ASSESSMENT_ID,
      questionId: SEERA_DEMO_QUESTIONS.BUDGET_INDEPENDENCE,
      standardNumber: SEERA_DEMO_STANDARDS.ORG_INDEPENDENCE,
      draftSummary: budgetSummary,
      provenance: draftProvenance(budgetSummary, "2026-06-17T09:00:00.000Z"),
      contentPin: pin,
      requiresHumanReview: true,
    },
    {
      kind: "draft_finding",
      status: "draft",
      findingId: "finding-ethics-flag",
      assessmentId: SEERA_DEMO_ASSESSMENT_ID,
      questionId: SEERA_DEMO_QUESTIONS.ETHICS_CHARTER,
      standardNumber: SEERA_DEMO_STANDARDS.ETHICS,
      draftSummary: ethicsSummary,
      provenance: draftProvenance(ethicsSummary, "2026-06-18T14:30:00.000Z"),
      contentPin: pin,
      requiresHumanReview: true,
    },
  ];
}

/** Human-reviewed gap conclusions — includes edit_accept on Q-1-2-1. */
export function createSeeraDemoFinalConclusions(): FinalConclusion[] {
  return [
    {
      kind: "final_conclusion",
      assessmentId: SEERA_DEMO_ASSESSMENT_ID,
      questionId: SEERA_DEMO_QUESTIONS.OBJECTIVITY_THREATS,
      standardNumber: SEERA_DEMO_STANDARDS.OBJECTIVITY,
      conclusion:
        "Reviewer-edited Seera conclusion: COI process gap confirmed.",
    },
  ];
}

/**
 * Working-paper rollups with deliberate unreviewed items on every standard.
 * Principle 2.1 is entirely unreviewed; 1.1 has one recorded non-conformance.
 */
export function createSeeraDemoConformanceByStandard(): Map<
  string,
  StandardConformanceSummary
> {
  const pin = createSeeraDemoContentPin();
  return new Map<string, StandardConformanceSummary>([
    [
      SEERA_DEMO_STANDARDS.ETHICS,
      {
        standardNumber: SEERA_DEMO_STANDARDS.ETHICS,
        pin,
        conforms: 1,
        doesNotConform: 0,
        notApplicable: 0,
        unreviewed: 2,
        totalItems: 3,
      },
    ],
    [
      SEERA_DEMO_STANDARDS.OBJECTIVITY,
      {
        standardNumber: SEERA_DEMO_STANDARDS.OBJECTIVITY,
        pin,
        conforms: 1,
        doesNotConform: 0,
        notApplicable: 0,
        unreviewed: 2,
        totalItems: 3,
      },
    ],
    [
      SEERA_DEMO_STANDARDS.ORG_INDEPENDENCE,
      {
        standardNumber: SEERA_DEMO_STANDARDS.ORG_INDEPENDENCE,
        pin,
        conforms: 0,
        doesNotConform: 0,
        notApplicable: 0,
        unreviewed: 3,
        totalItems: 3,
      },
    ],
  ]);
}

/** Remediation rows: closed item with retest loop history, open gap, domain-II retest. */
export function createSeeraDemoRemediationItems(
  locale: "en" | "ar",
): RemediationItem[] {
  return [
    {
      remediationId: "rem-ethics-ack",
      assessmentId: SEERA_DEMO_ASSESSMENT_ID,
      questionId: SEERA_DEMO_QUESTIONS.ETHICS_CHARTER,
      standardNumber: SEERA_DEMO_STANDARDS.ETHICS,
      action:
        locale === "ar"
          ? "تحديث عملية إقرار الميثاق الأخلاقي"
          : "Update ethics acknowledgement process",
      owner: locale === "ar" ? "مدير التدقيق" : "Audit Manager",
      targetDate: "2026-12-31",
      createdBy: "synthetic",
      createdAt: "2026-04-01T10:00:00.000Z",
      updatedBy: "synthetic",
      updatedAt: "2026-06-15T10:00:00.000Z",
      closedAt: "2026-06-18T10:00:00.000Z",
      retestNote: SEERA_DEMO_RETEST_FAIL_NOTE,
    },
    {
      remediationId: "rem-coi-process",
      assessmentId: SEERA_DEMO_ASSESSMENT_ID,
      questionId: SEERA_DEMO_QUESTIONS.OBJECTIVITY_THREATS,
      standardNumber: SEERA_DEMO_STANDARDS.OBJECTIVITY,
      action:
        locale === "ar"
          ? "تحديث إجراء إقرار تضارب المصالح"
          : "Update conflict-of-interest declaration process",
      owner: locale === "ar" ? "مدير التدقيق" : "Audit Manager",
      targetDate: "2026-08-15",
      createdBy: "synthetic",
      createdAt: "2026-04-10T10:00:00.000Z",
      updatedBy: "synthetic",
      updatedAt: "2026-05-01T10:00:00.000Z",
      closedAt: null,
      retestNote: null,
    },
    {
      remediationId: "rem-functional-reporting",
      assessmentId: SEERA_DEMO_ASSESSMENT_ID,
      questionId: SEERA_DEMO_QUESTIONS.FUNCTIONAL_REPORTING,
      standardNumber: SEERA_DEMO_STANDARDS.ORG_INDEPENDENCE,
      action:
        locale === "ar"
          ? "توثيق خط التقارير الوظيفي للتدقيق الداخلي"
          : "Document internal audit functional reporting line",
      owner: locale === "ar" ? "رئيس التدقيق" : "Chief Audit Executive",
      targetDate: "2026-09-01",
      createdBy: "synthetic",
      createdAt: "2026-05-01T10:00:00.000Z",
      updatedBy: "synthetic",
      updatedAt: "2026-06-10T10:00:00.000Z",
      closedAt: null,
      retestNote: null,
    },
  ];
}

export function createSeeraDemoResponses(
  locale: "en" | "ar",
): AssessmentResponse[] {
  const pin = createSeeraDemoContentPin();
  const respondedAt = "2026-05-10T10:00:00.000Z";

  return [
    {
      assessmentId: SEERA_DEMO_ASSESSMENT_ID,
      questionId: SEERA_DEMO_QUESTIONS.ETHICS_CHARTER,
      answer: "4",
      note:
        locale === "ar"
          ? "استجابة تجريبية — ميثاق الأخلاق"
          : "Synthetic Seera ethics response",
      pin,
      respondedBy: "audit-analyst",
      respondedAt,
    },
    {
      assessmentId: SEERA_DEMO_ASSESSMENT_ID,
      questionId: SEERA_DEMO_QUESTIONS.ETHICS_ACK,
      answer: "3",
      note: null,
      pin,
      respondedBy: "audit-analyst",
      respondedAt,
    },
    {
      assessmentId: SEERA_DEMO_ASSESSMENT_ID,
      questionId: SEERA_DEMO_QUESTIONS.OBJECTIVITY_THREATS,
      answer: "2",
      note: null,
      pin,
      respondedBy: "audit-analyst",
      respondedAt,
    },
    {
      assessmentId: SEERA_DEMO_ASSESSMENT_ID,
      questionId: SEERA_DEMO_QUESTIONS.COI_DECLARATIONS,
      answer: "Partial",
      note:
        locale === "ar"
          ? "بانتظار مراجعة الرئيس التنفيذي للتدقيق"
          : "Awaiting CAE review of submitted evidence",
      pin,
      respondedBy: "audit-analyst",
      respondedAt,
    },
    {
      assessmentId: SEERA_DEMO_ASSESSMENT_ID,
      questionId: SEERA_DEMO_QUESTIONS.FUNCTIONAL_REPORTING,
      answer: "1",
      note:
        locale === "ar"
          ? "محاضر المجلس قيد التجميع"
          : "Board minutes being compiled",
      pin,
      respondedBy: "audit-analyst",
      respondedAt,
    },
  ];
}

export function createSeeraDemoEvidenceMetadata(): EvidenceMetadataForPack[] {
  return [
    {
      evidenceId: "ev-ethics-charter",
      version: 1,
      fileName: "ethics-charter-acknowledgements.pdf",
      contentType: "application/pdf",
      sizeBytes: 245_000,
      scanStatus: "clean",
      links: [
        SEERA_DEMO_STANDARDS.ETHICS,
        SEERA_DEMO_QUESTIONS.ETHICS_CHARTER,
        SEERA_DEMO_QUESTIONS.ETHICS_ACK,
      ],
      uploadedAt: "2026-03-15T09:00:00.000Z",
    },
    {
      evidenceId: "ev-coi-process",
      version: 1,
      fileName: "coi-declaration-process.pdf",
      contentType: "application/pdf",
      sizeBytes: 128_000,
      scanStatus: "clean",
      links: [
        SEERA_DEMO_STANDARDS.OBJECTIVITY,
        SEERA_DEMO_QUESTIONS.OBJECTIVITY_THREATS,
        SEERA_DEMO_QUESTIONS.COI_DECLARATIONS,
      ],
      uploadedAt: "2026-04-20T11:00:00.000Z",
    },
    {
      evidenceId: "ev-board-minutes",
      version: 1,
      fileName: "board-minutes-functional-reporting.pdf",
      contentType: "application/pdf",
      sizeBytes: 512_000,
      scanStatus: "clean",
      links: [
        SEERA_DEMO_STANDARDS.ORG_INDEPENDENCE,
        SEERA_DEMO_QUESTIONS.FUNCTIONAL_REPORTING,
      ],
      uploadedAt: "2026-05-01T14:00:00.000Z",
    },
  ];
}

/** Count of AI-flagged items awaiting human disposition (Q-1-2-2). */
export const SEERA_DEMO_PENDING_REVIEW_COUNT = 1;
