import type { ItemStatus } from "@eqa/workflows/state-machine";

/** Client-safe role union — avoids pulling readiness-dashboard into client bundles. */
export type StandardDetailRole = "cae" | "audit_staff" | "board";

/** Client-safe locale union — avoids pulling @eqa/content into client bundles. */
export type StandardDetailLocale = "en" | "ar";

export type DerivedStandardStatus =
  | "gap"
  | "pending_review"
  | "in_progress"
  | "conforms"
  | "not_assessed"
  | "not_applicable";

export interface PresentedStandardEvidence {
  readonly evidenceId: string;
  readonly fileName: string;
  readonly scanStatus: "clean" | "quarantined" | "infected";
  readonly scanLabelEn: string;
  readonly scanLabelAr: string;
  readonly sizeLabelEn: string;
  readonly sizeLabelAr: string;
}

export interface PresentedStandardRequirement {
  readonly questionId: string;
  readonly questionText: string;
  readonly status: ItemStatus;
  readonly statusLabel: string;
  readonly answer: string | null;
  readonly note: string | null;
  readonly evidence: readonly PresentedStandardEvidence[];
  readonly draftSummary: string | null;
  readonly findingId: string | null;
  readonly finalConclusion: string | null;
  readonly rubric: readonly {
    readonly level: number;
    readonly label: string;
    readonly descriptor: string;
  }[];
  readonly pinPackId: string;
  readonly pinVersion: string;
  readonly pinHash: string;
  readonly remediationId: string | null;
  readonly remediationAction: string | null;
  readonly remediationOwner: string | null;
  readonly remediationTargetDate: string | null;
}

export interface PresentedWpConformanceItem {
  readonly id: string;
  readonly checklistId: string;
  readonly itemId: string;
  readonly itemText: string;
  readonly workingPaperRef: string;
  readonly workingPaperTitle: string;
  readonly conformanceLabel: string;
  readonly conformanceVariant: "conformant" | "partial" | "gap" | "neutral";
  readonly conformanceRaw: "conforms" | "does_not_conform" | "not_applicable" | null;
  readonly note: string | null;
  readonly recordedBy: string | null;
  readonly recordedAt: string | null;
}

export interface PresentedDecisionTrailEntry {
  readonly id: string;
  readonly occurredAt: string;
  readonly actorLabel: string;
  readonly actionLabel: string;
  readonly summary: string;
}

export interface StandardDetailPresentation {
  readonly assessmentId: string;
  readonly assessmentName: string;
  readonly locale: StandardDetailLocale;
  readonly role: StandardDetailRole;
  readonly roleLabel: string;
  readonly isSummaryView: boolean;
  readonly canOperate: boolean;
  readonly canReview: boolean;
  readonly standardNumber: string;
  readonly standardTitle: string;
  readonly domainLabel: string;
  readonly principleLabel: string;
  readonly contentPinLabel: string;
  readonly derivedStatus: DerivedStandardStatus;
  readonly derivedStatusLabel: string;
  readonly derivedStatusVariant: "conformant" | "partial" | "gap" | "neutral";
  readonly requirements: readonly PresentedStandardRequirement[];
  readonly wpConformance: readonly PresentedWpConformanceItem[];
  readonly decisionTrail: readonly PresentedDecisionTrailEntry[];
  readonly decisionTrailEmptyNote: string | null;
}

const GAP_ITEM_STATUSES: readonly ItemStatus[] = [
  "gap_confirmed",
  "remediation_in_progress",
];

const PENDING_ITEM_STATUSES: readonly ItemStatus[] = [
  "ai_flagged",
  "under_human_review",
];

const IN_PROGRESS_STATUSES: readonly ItemStatus[] = [
  "evidence_requested",
  "evidence_submitted",
  "ready_for_retest",
];

export function deriveStandardStatus(input: {
  readonly questionStatuses: readonly ItemStatus[];
  readonly hasOpenDraft: boolean;
  readonly wpNonConformant: boolean;
  readonly wpUnreviewed: boolean;
}): DerivedStandardStatus {
  const statuses = input.questionStatuses;
  if (
    statuses.some((s) => GAP_ITEM_STATUSES.includes(s)) ||
    input.wpNonConformant
  ) {
    return "gap";
  }
  if (
    statuses.some((s) => PENDING_ITEM_STATUSES.includes(s)) ||
    input.hasOpenDraft
  ) {
    return "pending_review";
  }
  if (
    statuses.some((s) => IN_PROGRESS_STATUSES.includes(s)) ||
    input.wpUnreviewed
  ) {
    return "in_progress";
  }
  if (statuses.length > 0 && statuses.every((s) => s === "not_applicable")) {
    return "not_applicable";
  }
  if (
    statuses.length > 0 &&
    statuses.every((s) =>
      ["closed_ready", "reviewed_no_gap", "not_applicable"].includes(s),
    )
  ) {
    return "conforms";
  }
  if (statuses.length > 0 && statuses.every((s) => s === "not_assessed")) {
    return "not_assessed";
  }
  return "in_progress";
}

function derivedStatusLabel(
  status: DerivedStandardStatus,
  locale: StandardDetailLocale,
): string {
  const labels: Record<DerivedStandardStatus, { en: string; ar: string }> = {
    gap: { en: "Gap — attention required", ar: "فجوة — يتطلب اهتماماً" },
    pending_review: {
      en: "Pending human review",
      ar: "بانتظار المراجعة البشرية",
    },
    in_progress: { en: "In progress", ar: "قيد التقدم" },
    conforms: { en: "Conforms", ar: "مطابق" },
    not_assessed: { en: "Not assessed", ar: "لم يُقيَّم" },
    not_applicable: { en: "Not applicable", ar: "غير قابل للتطبيق" },
  };
  return locale === "ar" ? labels[status].ar : labels[status].en;
}

function derivedStatusVariant(
  status: DerivedStandardStatus,
): "conformant" | "partial" | "gap" | "neutral" {
  if (status === "conforms" || status === "not_applicable") return "conformant";
  if (status === "gap") return "gap";
  if (status === "pending_review" || status === "in_progress") return "partial";
  return "neutral";
}

export function computeDerivedStandardPresentation(
  requirements: readonly PresentedStandardRequirement[],
  wpConformance: readonly PresentedWpConformanceItem[],
  locale: StandardDetailLocale,
): Pick<
  StandardDetailPresentation,
  "derivedStatus" | "derivedStatusLabel" | "derivedStatusVariant"
> {
  const derivedStatus = deriveStandardStatus({
    questionStatuses: requirements.map((r) => r.status),
    hasOpenDraft: requirements.some(
      (r) => r.draftSummary && !r.finalConclusion && r.status === "ai_flagged",
    ),
    wpNonConformant: wpConformance.some((w) => w.conformanceRaw === "does_not_conform"),
    wpUnreviewed: wpConformance.some((w) => w.conformanceRaw === null),
  });
  return {
    derivedStatus,
    derivedStatusLabel: derivedStatusLabel(derivedStatus, locale),
    derivedStatusVariant: derivedStatusVariant(derivedStatus),
  };
}
