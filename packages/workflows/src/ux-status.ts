import type { ItemStatus } from "./state-machine";

export type ReadinessLevel = "green" | "amber" | "red";

/**
 * Plain-language status labels for orientation UI. Distinct from machine
 * {@link STATUS_LABELS} — written for someone seeing the tool for the first time.
 */
export const UX_STATUS_LABELS: Record<
  ItemStatus,
  { en: string; ar: string; level: ReadinessLevel }
> = {
  not_assessed: {
    en: "Not started",
    ar: "لم يبدأ",
    level: "amber",
  },
  evidence_requested: {
    en: "Evidence needed",
    ar: "مطلوب أدلة",
    level: "amber",
  },
  evidence_submitted: {
    en: "Evidence submitted — awaiting review",
    ar: "قُدمت الأدلة — بانتظار المراجعة",
    level: "amber",
  },
  ai_flagged: {
    en: "Possible gap flagged — awaiting your review",
    ar: "فجوة محتملة — بانتظار مراجعتك",
    level: "amber",
  },
  under_human_review: {
    en: "Awaiting your review",
    ar: "بانتظار مراجعتك",
    level: "amber",
  },
  gap_confirmed: {
    en: "Gap found — being remediated",
    ar: "فجوة مؤكدة — قيد المعالجة",
    level: "red",
  },
  reviewed_no_gap: {
    en: "Reviewed — no gap",
    ar: "روجِع — لا توجد فجوة",
    level: "green",
  },
  remediation_in_progress: {
    en: "Gap found — being remediated",
    ar: "فجوة مؤكدة — قيد المعالجة",
    level: "red",
  },
  ready_for_retest: {
    en: "Remediation done — ready for re-test",
    ar: "اكتملت المعالجة — جاهز لإعادة الاختبار",
    level: "amber",
  },
  closed_ready: {
    en: "Ready",
    ar: "جاهز",
    level: "green",
  },
  not_applicable: {
    en: "Not applicable",
    ar: "لا ينطبق",
    level: "green",
  },
};

/** Resolves the UX-oriented label for a workflow status in the given locale. */
export function uxStatusLabel(
  status: ItemStatus,
  locale: "en" | "ar",
): string {
  const row = UX_STATUS_LABELS[status];
  return locale === "ar" ? row.ar : row.en;
}

/** Colour band for a workflow status (orientation badges). */
export function uxStatusLevel(status: ItemStatus): ReadinessLevel {
  return UX_STATUS_LABELS[status].level;
}
