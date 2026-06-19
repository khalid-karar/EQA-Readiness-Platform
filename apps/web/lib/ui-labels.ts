import type { Locale } from "@eqa/content";

type LabelSet = Record<string, { en: string; ar: string }>;

export const UI_LABELS: LabelSet = {
  assessment: { en: "Assessment", ar: "التقييم" },
  location: { en: "Location", ar: "الموقع" },
  role: { en: "Your role", ar: "دورك" },
  overview: { en: "Overview — all standards", ar: "نظرة عامة — جميع المعايير" },
  summaryView: { en: "Summary view", ar: "عرض ملخص" },
  detailView: { en: "Detail view", ar: "عرض تفصيلي" },
  progressTitle: { en: "Assessment progress", ar: "تقدم التقييم" },
  whatsNext: { en: "What's next", ar: "الخطوة التالية" },
  whatsNextEmpty: {
    en: "No pending actions — you're caught up.",
    ar: "لا توجد إجراءات معلقة — أنت على اطلاع.",
  },
  summaryHint: {
    en: "High-level view for oversight. Switch to an operational role for specific tasks.",
    ar: "عرض عام للإشراف. انتقل إلى دور تشغيلي للمهام المحددة.",
  },
  readinessTitle: { en: "Overall readiness", ar: "الجاهزية الإجمالية" },
  readinessHint: {
    en: "Based on assessment statuses, reviewed findings, and working-paper conformance (including unreviewed items).",
    ar: "استناداً إلى حالات التقييم، والنتائج المراجَعة، ومطابقة أوراق العمل (بما في ذلك البنود غير المراجَعة).",
  },
  heatMapTitle: { en: "Conformance heat map", ar: "خريطة حرارية للمطابقة" },
  heatMapSubtitle: {
    en: "Domain → principle → standard. Click a cell for detail.",
    ar: "نطاق ← مبدأ ← معيار. انقر على خلية للتفاصيل.",
  },
  locale: { en: "Language", ar: "اللغة" },
  viewAs: { en: "View as", ar: "العرض كـ" },
  demoNote: {
    en: "Synthetic demo data — switch language and role to preview RBAC views.",
    ar: "بيانات تجريبية — بدّل اللغة والدور لمعاينة صلاحيات العرض.",
  },
  standardDetail: { en: "Selected standard", ar: "المعيار المحدد" },
  questionItems: { en: "Assessment items", ar: "عناصر التقييم" },
  wpConformance: { en: "Working-paper conformance", ar: "مطابقة أوراق العمل" },
  conforms: { en: "Conforms", ar: "مطابق" },
  gaps: { en: "Gaps", ar: "فجوات" },
  unreviewed: { en: "Unreviewed", ar: "غير مراجَع" },
  total: { en: "Total", ar: "الإجمالي" },
  readiness: { en: "Readiness", ar: "الجاهزية" },
  wpReview: { en: "Working-paper review", ar: "مراجعة أوراق العمل" },
};

export function uiLabel(key: keyof typeof UI_LABELS, locale: Locale): string {
  const entry = UI_LABELS[key];
  if (!entry) return key;
  return entry[locale] ?? entry.en;
}

export function progressStartedLabel(
  locale: Locale,
  started: number,
  total: number,
): string {
  return locale === "ar"
    ? `${started} من ${total} معيار بدأ`
    : `${started} of ${total} standards started`;
}

export function progressCompleteLabel(
  locale: Locale,
  completed: number,
  total: number,
  percent: number,
): string {
  return locale === "ar"
    ? `${completed} من ${total} مكتمل (${percent}٪)`
    : `${completed} of ${total} complete (${percent}%)`;
}

export function progressRemainingLabel(locale: Locale, count: number): string {
  return locale === "ar" ? `${count} قيد التقدم` : `${count} in progress`;
}

export function progressNotStartedLabel(locale: Locale, count: number): string {
  return locale === "ar" ? `${count} لم يبدأ` : `${count} not started`;
}
