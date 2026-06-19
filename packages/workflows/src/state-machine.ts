import { IllegalStatusTransitionError, UnknownItemStatusError } from "./errors";

/**
 * The status of a single assessment item (one standard/question). Modelled as an
 * explicit, closed set of states with an explicit transition graph (below) so the
 * workflow is enforceable rather than implied by scattered conditionals.
 */
export const ITEM_STATUSES = [
  "not_assessed",
  "evidence_requested",
  "evidence_submitted",
  "ai_flagged",
  "under_human_review",
  "gap_confirmed",
  "reviewed_no_gap",
  "remediation_in_progress",
  "ready_for_retest",
  "closed_ready",
  "not_applicable",
] as const;

export type ItemStatus = (typeof ITEM_STATUSES)[number];

/** Every item begins here until it is acted upon. */
export const INITIAL_ITEM_STATUS: ItemStatus = "not_assessed";

/**
 * Bilingual display labels (English + Arabic). The state machine itself is keyed
 * by stable machine codes; labels are for presentation only, per the platform's
 * bilingual rule.
 */
export const STATUS_LABELS: Record<ItemStatus, { en: string; ar: string }> = {
  not_assessed: { en: "Not Assessed", ar: "لم يُقيَّم" },
  evidence_requested: { en: "Evidence Requested", ar: "طُلبت الأدلة" },
  evidence_submitted: { en: "Evidence Submitted", ar: "قُدمت الأدلة" },
  ai_flagged: { en: "AI Flagged", ar: "مُعلَّم بالذكاء الاصطناعي" },
  under_human_review: { en: "Under Human Review", ar: "قيد المراجعة البشرية" },
  gap_confirmed: { en: "Gap Confirmed", ar: "فجوة مؤكدة" },
  reviewed_no_gap: { en: "Reviewed — No Gap", ar: "روجِعت — لا توجد فجوة" },
  remediation_in_progress: {
    en: "Remediation In Progress",
    ar: "المعالجة قيد التنفيذ",
  },
  ready_for_retest: { en: "Ready for Re-test", ar: "جاهز لإعادة الاختبار" },
  closed_ready: { en: "Closed/Ready", ar: "مغلق/جاهز" },
  not_applicable: { en: "Not Applicable", ar: "لا ينطبق" },
};

/**
 * The legal transition graph and single source of truth for the workflow. A move
 * from `X` to `Y` is permitted only if `Y` appears in `TRANSITIONS[X]`. The data
 * layer imports {@link assertTransition}, so an illegal transition is rejected at
 * persistence time — never merely hidden in the UI.
 *
 * Invariants worth calling out:
 * - `ai_flagged` can only move to `under_human_review`: an AI finding is draft
 *   work product and must be confirmed by a human before it means anything.
 * - From `under_human_review` the only outcomes are `gap_confirmed` (a real gap)
 *   or `reviewed_no_gap` (the finding is dismissed). There is deliberately NO
 *   direct edge to `closed_ready`, so a dismissed AI flag lands in
 *   `reviewed_no_gap` and can never be collapsed straight into Closed/Ready.
 * - A confirmed gap must travel `gap_confirmed → remediation_in_progress →
 *   ready_for_retest` before it can close; a failed re-test loops back to review.
 * - `closed_ready` is terminal.
 */
const TRANSITIONS: Record<ItemStatus, readonly ItemStatus[]> = {
  not_assessed: ["evidence_requested", "not_applicable"],
  evidence_requested: ["evidence_submitted", "not_applicable"],
  evidence_submitted: ["ai_flagged", "under_human_review", "not_applicable"],
  ai_flagged: ["under_human_review"],
  under_human_review: ["gap_confirmed", "reviewed_no_gap"],
  gap_confirmed: ["remediation_in_progress"],
  remediation_in_progress: ["ready_for_retest"],
  ready_for_retest: ["under_human_review", "closed_ready"],
  reviewed_no_gap: ["closed_ready"],
  closed_ready: [],
  not_applicable: ["not_assessed"],
};

/** Type guard for an arbitrary value being a known item status. */
export function isItemStatus(value: unknown): value is ItemStatus {
  return (
    typeof value === "string" &&
    (ITEM_STATUSES as readonly string[]).includes(value)
  );
}

/** Narrows an arbitrary value to {@link ItemStatus} or throws. */
export function assertItemStatus(value: unknown): ItemStatus {
  if (!isItemStatus(value)) {
    throw new UnknownItemStatusError(
      `'${String(value)}' is not a known item status.`,
    );
  }
  return value;
}

/** The statuses reachable from `from` in a single legal transition. */
export function allowedTransitions(from: ItemStatus): readonly ItemStatus[] {
  return TRANSITIONS[from];
}

/** True if moving `from → to` is a legal transition. */
export function canTransition(from: ItemStatus, to: ItemStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** True if no transition leads out of `status` (a terminal state). */
export function isTerminalStatus(status: ItemStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

/**
 * Throws {@link IllegalStatusTransitionError} unless `from → to` is a legal
 * transition. This is the gate the data layer calls before persisting, so the
 * rule cannot be bypassed by writing to the repository directly.
 */
export function assertTransition(from: ItemStatus, to: ItemStatus): void {
  if (!canTransition(from, to)) {
    const allowed = allowedTransitions(from);
    throw new IllegalStatusTransitionError(
      `Illegal status transition '${from}' → '${to}'. Allowed from '${from}': ${
        allowed.length > 0 ? allowed.join(", ") : "(none — terminal state)"
      }.`,
    );
  }
}
