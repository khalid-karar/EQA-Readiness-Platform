import type { Locale } from "@eqa/content";
import { localize } from "@eqa/content";
import type { FinalConclusion } from "./findings";
import {
  computeMockEqaSimulation,
  MOCK_EQA_DISCLAIMER,
  type MockEqaScoringInput,
  type MockEqaSimulationResult,
} from "./mock-eqa-scoring";
import {
  INITIAL_ITEM_STATUS,
  STATUS_LABELS,
  type ItemStatus,
} from "./state-machine";
import type {
  AssessmentResponse,
  QuestionnaireView,
  QuestionView,
  StandardView,
} from "./types";
import type { RemediationItem } from "./remediation";
import { uxStatusLabel } from "./readiness-dashboard";

/** Kind discriminant — a readiness support pack, not a formal assessor deliverable. */
export const EVIDENCE_PACK_KIND = "readiness_evidence_pack" as const;

/** Confidentiality footer text on every page of the exported pack. */
export const EVIDENCE_PACK_CONFIDENTIALITY = {
  en:
    "CONFIDENTIAL — For authorized EQA readiness use only. Do not distribute " +
    "outside the audit function and designated oversight recipients.",
  ar:
    "سري — للاستخدام المصرّح به في جاهزية EQA فقط. لا يُوزَّع خارج وظيفة " +
    "التدقيق والمستلمين المعنيين بالإشراف.",
  shortEn: "CONFIDENTIAL — EQA readiness pack",
  shortAr: "سري — حزمة جاهزية EQA",
} as const;

export type EvidencePackFormat = "pdf" | "docx";

/** Metadata-only evidence reference — never raw file bytes. */
export interface EvidenceIndexEntry {
  readonly evidenceId: string;
  readonly version: number;
  readonly fileName: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly scanStatus: string;
  readonly links: readonly string[];
  readonly uploadedAt: string;
  readonly referenceLabel: string;
}

export interface QuestionPackDetail {
  readonly questionId: string;
  readonly questionText: string;
  readonly status: ItemStatus;
  readonly statusLabel: string;
  readonly reviewerNote?: string;
  readonly gapFinding?: string;
}

export interface StandardPackSection {
  readonly standardNumber: string;
  readonly standardTitle: string;
  readonly domainNumber: string;
  readonly domainTitle: string;
  readonly gapStatusSummary: string;
  readonly remediationSummary?: string;
  readonly questions: readonly QuestionPackDetail[];
  readonly evidenceIndex: readonly EvidenceIndexEntry[];
}

export interface EvidencePackReadinessSummary {
  readonly score: number;
  readonly level: string;
  readonly label: string;
}

/**
 * Complete evidence pack manifest. By default {@link includeRawEvidence} is
 * `false` and {@link bundledFileCount} is `0` — only references/metadata are
 * included, not confidential source documents.
 */
export interface EvidencePackManifest {
  readonly kind: typeof EVIDENCE_PACK_KIND;
  readonly exportId: string;
  readonly assessmentId: string;
  readonly assessmentName: { readonly en: string; readonly ar: string };
  readonly locale: Locale;
  readonly format: EvidencePackFormat;
  readonly generatedAt: string;
  readonly generatedBy: string;
  readonly includeRawEvidence: false;
  readonly rawEvidenceExcluded: true;
  readonly bundledFileCount: 0;
  readonly readinessSummary: EvidencePackReadinessSummary;
  readonly standards: readonly StandardPackSection[];
  readonly confidentialityFooter: typeof EVIDENCE_PACK_CONFIDENTIALITY;
  readonly assessorDisclaimer: typeof MOCK_EQA_DISCLAIMER;
}

export interface EvidenceMetadataForPack {
  readonly evidenceId: string;
  readonly version: number;
  readonly fileName: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly scanStatus: string;
  readonly links: readonly string[];
  readonly uploadedAt: string;
}

export interface EvidencePackAssemblyInput {
  readonly assessmentId: string;
  readonly assessmentName: { readonly en: string; readonly ar: string };
  readonly locale: Locale;
  readonly questionnaire: QuestionnaireView;
  readonly statusesByQuestion: ReadonlyMap<string, ItemStatus>;
  readonly responses: readonly AssessmentResponse[];
  readonly finalConclusions: readonly FinalConclusion[];
  readonly remediationItems: readonly RemediationItem[];
  readonly evidenceMetadata: readonly EvidenceMetadataForPack[];
  readonly readinessInput?: MockEqaScoringInput;
  readonly simulation?: MockEqaSimulationResult;
  readonly exportId?: string;
  readonly generatedAt?: string;
  readonly generatedBy?: string;
  readonly format?: EvidencePackFormat;
}

function linksStandard(
  links: readonly string[],
  standardNumber: string,
  questionIds: readonly string[],
): boolean {
  return links.some(
    (link) =>
      link === standardNumber ||
      link === `S${standardNumber}` ||
      questionIds.includes(link),
  );
}

function toIndexEntry(
  meta: EvidenceMetadataForPack,
  locale: Locale,
): EvidenceIndexEntry {
  const ref =
    locale === "ar"
      ? `مرجع: ${meta.evidenceId} (إصدار ${meta.version})`
      : `Ref: ${meta.evidenceId} (v${meta.version})`;
  return {
    evidenceId: meta.evidenceId,
    version: meta.version,
    fileName: meta.fileName,
    contentType: meta.contentType,
    sizeBytes: meta.sizeBytes,
    scanStatus: meta.scanStatus,
    links: meta.links,
    uploadedAt: meta.uploadedAt,
    referenceLabel: ref,
  };
}

function gapStatusSummary(
  statuses: readonly ItemStatus[],
  locale: Locale,
): string {
  const gapCount = statuses.filter(
    (s) =>
      s === "gap_confirmed" ||
      s === "remediation_in_progress" ||
      s === "ready_for_retest",
  ).length;
  const pending = statuses.filter(
    (s) => s === "ai_flagged" || s === "under_human_review",
  ).length;
  if (locale === "ar") {
    return `${gapCount} فجوة/فجوات مؤكدة أو قيد المعالجة؛ ${pending} بانتظار المراجعة`;
  }
  return `${gapCount} confirmed/remediation gap(s); ${pending} pending human review`;
}

function remediationSummaryForStandard(
  items: readonly RemediationItem[],
  standardNumber: string,
  locale: Locale,
): string | undefined {
  const stdItems = items.filter((i) => i.standardNumber === standardNumber);
  if (stdItems.length === 0) return undefined;
  return stdItems
    .map((item) => {
      const status = item.closedAt
        ? locale === "ar"
          ? "مغلق"
          : "Closed"
        : locale === "ar"
          ? "مفتوح"
          : "Open";
      return `${item.owner}: ${item.action} (${status})`;
    })
    .join(locale === "ar" ? "؛ " : "; ");
}

function buildQuestionDetail(
  question: QuestionView,
  locale: Locale,
  statusesByQuestion: ReadonlyMap<string, ItemStatus>,
  responsesByQuestion: ReadonlyMap<string, AssessmentResponse>,
  conclusionsByQuestion: ReadonlyMap<string, FinalConclusion>,
): QuestionPackDetail {
  const status =
    statusesByQuestion.get(question.questionId) ?? INITIAL_ITEM_STATUS;
  const response = responsesByQuestion.get(question.questionId);
  const conclusion = conclusionsByQuestion.get(question.questionId);
  const isGap =
    status === "gap_confirmed" ||
    status === "remediation_in_progress" ||
    status === "ready_for_retest";

  return {
    questionId: question.questionId,
    questionText: question.text,
    status,
    statusLabel: uxStatusLabel(status, locale),
    ...(response?.note === undefined || response.note === null
      ? {}
      : { reviewerNote: response.note }),
    ...(conclusion && isGap ? { gapFinding: conclusion.conclusion } : {}),
    ...(conclusion && !isGap && !response?.note
      ? { reviewerNote: conclusion.conclusion }
      : {}),
  };
}

function buildStandardSection(
  standard: StandardView,
  domainNumber: string,
  domainTitle: string,
  input: EvidencePackAssemblyInput,
  responsesByQuestion: ReadonlyMap<string, AssessmentResponse>,
  conclusionsByQuestion: ReadonlyMap<string, FinalConclusion>,
): StandardPackSection {
  const questionIds = standard.questions.map((q) => q.questionId);
  const statuses = standard.questions.map(
    (q) => input.statusesByQuestion.get(q.questionId) ?? INITIAL_ITEM_STATUS,
  );

  const evidenceIndex = input.evidenceMetadata
    .filter((meta) => linksStandard(meta.links, standard.number, questionIds))
    .map((meta) => toIndexEntry(meta, input.locale));

  const remediationSummary = remediationSummaryForStandard(
    input.remediationItems,
    standard.number,
    input.locale,
  );

  return {
    standardNumber: standard.number,
    standardTitle: standard.title,
    domainNumber,
    domainTitle,
    gapStatusSummary: gapStatusSummary(statuses, input.locale),
    ...(remediationSummary === undefined ? {} : { remediationSummary }),
    questions: standard.questions.map((q) =>
      buildQuestionDetail(
        q,
        input.locale,
        input.statusesByQuestion,
        responsesByQuestion,
        conclusionsByQuestion,
      ),
    ),
    evidenceIndex,
  };
}

/** True when `value` is an {@link EvidencePackManifest}. */
export function isEvidencePackManifest(
  value: unknown,
): value is EvidencePackManifest {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { kind?: unknown }).kind === EVIDENCE_PACK_KIND
  );
}

/**
 * Pure assembly: standard-by-standard pack from statuses, reviewer notes,
 * gap/remediation state, evidence index (references only), and readiness
 * summary. Raw evidence bytes are never included.
 */
export function buildEvidencePackManifest(
  input: EvidencePackAssemblyInput,
): EvidencePackManifest {
  const responsesByQuestion = new Map(
    input.responses.map((r) => [r.questionId, r]),
  );
  const conclusionsByQuestion = new Map(
    input.finalConclusions.map((c) => [c.questionId, c]),
  );

  const simulation =
    input.simulation ??
    (input.readinessInput
      ? computeMockEqaSimulation(input.readinessInput)
      : undefined);

  const standards: StandardPackSection[] = [];
  for (const domain of input.questionnaire.domains) {
    for (const principle of domain.principles) {
      for (const standard of principle.standards) {
        standards.push(
          buildStandardSection(
            standard,
            domain.number,
            domain.title,
            input,
            responsesByQuestion,
            conclusionsByQuestion,
          ),
        );
      }
    }
  }

  const readinessSummary: EvidencePackReadinessSummary = simulation
    ? {
        score: simulation.overall.score,
        level: simulation.overall.level,
        label: simulation.overall.label,
      }
    : {
        score: 0,
        level: "amber",
        label:
          input.locale === "ar"
            ? "ملخص الجاهزية غير متوفر"
            : "Readiness summary unavailable",
      };

  return {
    kind: EVIDENCE_PACK_KIND,
    exportId: input.exportId ?? `pack-${input.assessmentId}`,
    assessmentId: input.assessmentId,
    assessmentName: input.assessmentName,
    locale: input.locale,
    format: input.format ?? "pdf",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    generatedBy: input.generatedBy ?? "system:evidence-pack",
    includeRawEvidence: false,
    rawEvidenceExcluded: true,
    bundledFileCount: 0,
    readinessSummary,
    standards,
    confidentialityFooter: EVIDENCE_PACK_CONFIDENTIALITY,
    assessorDisclaimer: MOCK_EQA_DISCLAIMER,
  };
}

/** Machine status label fallback for pack detail tables. */
export function packStatusLabel(status: ItemStatus, locale: Locale): string {
  return localize(STATUS_LABELS[status], locale);
}
