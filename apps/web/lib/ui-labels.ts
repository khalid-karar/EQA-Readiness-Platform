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
  progressMetricHint: {
    en: "How many standards are fully complete — a different measure than overall readiness.",
    ar: "عدد المعايير المكتملة بالكامل — مقياس مختلف عن الجاهزية الإجمالية.",
  },
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
    en: "Weighted conformance across all standards (statuses, findings, and working-paper review including unreviewed items) — not the same as completion % in the sidebar.",
    ar: "مطابقة مرجّحة عبر جميع المعايير (الحالات، والنتائج، ومراجعة أوراق العمل بما فيها غير المراجَع) — ليست نفس نسبة الإكمال في الشريط الجانبي.",
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
  remediationTitle: { en: "Remediation tracker", ar: "متتبع المعالجة" },
  remediationLocation: {
    en: "Confirmed gaps — remediation status",
    ar: "الفجوات المؤكدة — حالة المعالجة",
  },
  openGaps: { en: "Open gaps", ar: "فجوات مفتوحة" },
  overdue: { en: "Overdue", ar: "متأخر" },
  onTrack: { en: "On track", ar: "في الموعد" },
  schedule: { en: "Schedule", ar: "الموعد" },
  owner: { en: "Owner", ar: "المسؤول" },
  targetDate: { en: "Target date", ar: "التاريخ المستهدف" },
  action: { en: "Remediation action", ar: "إجراء المعالجة" },
  standard: { en: "Standard", ar: "المعيار" },
  status: { en: "Status", ar: "الحالة" },
  closed: { en: "Closed", ar: "مغلق" },
  daysOverdue: { en: "days overdue", ar: "يوم متأخر" },
  remediationSummaryHint: {
    en: "Read-only oversight view. Operational roles can update remediation items.",
    ar: "عرض إشرافي للقراءة فقط. الأدوار التشغيلية يمكنها تحديث بنود المعالجة.",
  },
  selectRowHint: {
    en: "Click a row for detail. Operational roles can advance status in a future build.",
    ar: "انقر على صف للتفاصيل. الأدوار التشغيلية ستتمكن من تقديم الحالة لاحقاً.",
  },
  boardRemediationTableHint: {
    en: "Oversight view — standards and status only. Switch to an operational role for owner and deadline detail.",
    ar: "عرض إشرافي — المعايير والحالة فقط. انتقل إلى دور تشغيلي لتفاصيل المسؤول والموعد.",
  },
  boardRemediationDetailHint: {
    en: "Oversight summary. Owner names and target dates are available to operational roles only.",
    ar: "ملخص إشرافي. أسماء المسؤولين والتواريخ المستهدفة متاحة للأدوار التشغيلية فقط.",
  },
  mockEqaLocation: {
    en: "Simulated readiness — all domains",
    ar: "جاهزية محاكية — جميع النطاقات",
  },
  mockEqaOverallTitle: {
    en: "Simulated overall readiness",
    ar: "الجاهزية الإجمالية المحاكية",
  },
  mockEqaOverallHint: {
    en: "External-assessor-style simulation from item statuses, human-reviewed findings, and working-paper conformance (including unreviewed). Not an official result.",
    ar: "محاكاة بأسلوب المقيّم الخارجي من حالات العناصر والنتائج المراجَعة ومطابقة أوراق العمل (بما فيها غير المراجَع). ليست نتيجة رسمية.",
  },
  mockEqaBreakdownTitle: {
    en: "Simulated ratings by domain & standard",
    ar: "درجات محاكية حسب النطاق والمعيار",
  },
  mockEqaBreakdownSubtitle: {
    en: "Click a standard to see the driving gaps behind its simulated rating.",
    ar: "انقر على معيار لعرض الفجوات المؤثرة في درجته المحاكية.",
  },
  mockEqaDrivingGaps: {
    en: "driving gap(s)",
    ar: "فجوة/فجوات مؤثرة",
  },
  mockEqaNoGaps: {
    en: "No driving gaps surfaced for this standard",
    ar: "لا توجد فجوات مؤثرة لهذا المعيار",
  },
  mockEqaGapDetailTitle: {
    en: "Driving gaps",
    ar: "الفجوات المؤثرة",
  },
  mockEqaSelectStandard: {
    en: "Select a standard to see what drives its simulated rating.",
    ar: "اختر معياراً لمعرفة ما يؤثر في درجته المحاكية.",
  },
  mockEqaRunHint: {
    en: "CAE and Audit Staff can enqueue a tenant-scoped background simulation (Step 6.5). This demo shows the latest synthetic result.",
    ar: "يمكن للرئيس التنفيذي للتدقيق وفريق التدقيق تشغيل محاكاة خلفية ضمن المستأجر (الخطوة 6.5). هذا العرض يعرض أحدث نتيجة تجريبية.",
  },
  mockEqaRunButton: {
    en: "Run readiness simulation",
    ar: "تشغيل محاكاة الجاهزية",
  },
  mockEqaBoardHint: {
    en: "Read-only oversight of the simulated score. Board cannot run simulations.",
    ar: "إشراف للقراءة فقط على الدرجة المحاكية. لا يمكن للمجلس تشغيل المحاكاة.",
  },
  packLocation: {
    en: "Evidence pack — export & download",
    ar: "حزمة الأدلة — التصدير والتنزيل",
  },
  packSummaryTitle: {
    en: "Pack summary (synthetic demo)",
    ar: "ملخص الحزمة (عرض تجريبي)",
  },
  packStandards: { en: "Standards covered", ar: "المعايير المشمولة" },
  packEvidenceRefs: {
    en: "Evidence references (metadata only)",
    ar: "مراجع الأدلة (بيانات وصفية فقط)",
  },
  packRawBundled: { en: "Raw files bundled", ar: "ملفات خام مُضمَّنة" },
  packReadiness: {
    en: "Simulated readiness summary",
    ar: "ملخص الجاهزية المحاكية",
  },
  packNoRawHint: {
    en: "Raw confidential evidence files are excluded by default. The pack contains references and metadata only.",
    ar: "تُستبعد ملفات الأدلة السرية الخام افتراضياً. تحتوي الحزمة على المراجع والبيانات الوصفية فقط.",
  },
  packContentsHint: {
    en: "Each standard section in the generated pack includes:",
    ar: "يتضمن قسم كل معيار في الحزمة المُولَّدة:",
  },
  packContentsIndex: {
    en: "Evidence index — which files support the standard (references, not raw files)",
    ar: "فهرس الأدلة — الملفات الداعمة للمعيار (مراجع، وليست ملفات خام)",
  },
  packContentsNotes: {
    en: "Reviewer notes from questionnaire responses and human review",
    ar: "ملاحظات المراجع من الاستبيان والمراجعة البشرية",
  },
  packContentsGaps: {
    en: "Gap status per assessment item",
    ar: "حالة الفجوات لكل عنصر",
  },
  packContentsRemediation: {
    en: "Remediation status for confirmed gaps",
    ar: "حالة المعالجة للفجوات المؤكدة",
  },
  packContentsReadiness: {
    en: "Final simulated readiness summary (not a formal assessor conclusion)",
    ar: "ملخص الجاهزية المحاكية النهائي (ليس استنتاجاً رسمياً للمقيّم)",
  },
  packGenerateHint: {
    en: "CAE and Audit Staff enqueue a tenant-scoped background export (Step 6.5). Demo shows synthetic summary; generate button wires in Phase 5.",
    ar: "يُشغِّل الرئيس التنفيذي للتدقيق وفريق التدقيق تصديراً خلفياً ضمن المستأجر (الخطوة 6.5). يعرض العرض التجريبي ملخصاً تجريبياً؛ زر التوليد يُربَط في المرحلة 5.",
  },
  packGenerateButton: {
    en: "Generate evidence pack",
    ar: "توليد حزمة الأدلة",
  },
  packGenerateAction: {
    en: "Generate a new evidence pack (background job)",
    ar: "توليد حزمة أدلة جديدة (مهمة خلفية)",
  },
  packDownloadTitle: {
    en: "Download sample pack (PDF)",
    ar: "تنزيل حزمة تجريبية (PDF)",
  },
  packDownloadHint: {
    en: "Synthetic demo PDF — verify confidentiality footer, assessor disclaimer, and that no raw evidence is embedded.",
    ar: "PDF تجريبي — تحقق من تذييل السرية وإخلاء المسؤولية وعدم تضمين أدلة خام.",
  },
  packDownloadButton: {
    en: "Download sample PDF",
    ar: "تنزيل PDF تجريبي",
  },
  packBoardHint: {
    en: "Read-only — Board can view and download a generated pack but cannot trigger generation.",
    ar: "للقراءة فقط — يمكن للمجلس عرض وتنزيل حزمة مُولَّدة لكن لا يمكنه تشغيل التوليد.",
  },
  journeyMapTitle: {
    en: "Readiness journey map",
    ar: "خريطة رحلة الجاهزية",
  },
  journeyMapSubtitle: {
    en: "Seven checkpoints to EQA-ready. Path fill reflects overall readiness.",
    ar: "سبع محطات حتى الجاهزية لـ EQA. يعكس شريط المسار الجاهزية الإجمالية.",
  },
  journeyStepperLabel: {
    en: "Readiness journey steps",
    ar: "خطوات رحلة الجاهزية",
  },
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
