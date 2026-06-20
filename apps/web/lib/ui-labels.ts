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
    en: "Click a row to open detail. Operational roles can advance remediation status.",
    ar: "انقر على صف لفتح التفاصيل. الأدوار التشغيلية يمكنها تقديم حالة المعالجة.",
  },
  boardRemediationTableHint: {
    en: "Oversight view — standards and status only. Switch to an operational role for owner and deadline detail.",
    ar: "عرض إشرافي — المعايير والحالة فقط. انتقل إلى دور تشغيلي لتفاصيل المسؤول والموعد.",
  },
  boardRemediationDetailHint: {
    en: "Oversight summary. Owner names and target dates are available to operational roles only.",
    ar: "ملخص إشرافي. أسماء المسؤولين والتواريخ المستهدفة متاحة للأدوار التشغيلية فقط.",
  },
  remediationSubtitle: {
    en: "Track confirmed gaps through remediation, retest, and closure.",
    ar: "تتبع الفجوات المؤكدة عبر المعالجة وإعادة الاختبار والإغلاق.",
  },
  remediationSearch: { en: "Search remediation items…", ar: "بحث في بنود المعالجة…" },
  remediationEmptyTitle: {
    en: "No remediation items",
    ar: "لا توجد بنود معالجة",
  },
  remediationEmptyDescription: {
    en: "Confirmed gaps with remediation plans will appear here.",
    ar: "ستظهر هنا الفجوات المؤكدة التي لها خطط معالجة.",
  },
  remediationErrorDemo: {
    en: "Could not load remediation tracker (demo error state).",
    ar: "تعذّر تحميل متتبع المعالجة (حالة خطأ تجريبية).",
  },
  remediationDetailSubtitle: { en: "Remediation item", ar: "بند المعالجة" },
  remediationLifecycleTitle: { en: "Lifecycle", ar: "دورة الحياة" },
  remediationLifecycleGap: { en: "Gap confirmed", ar: "فجوة مؤكدة" },
  remediationLifecycleInProgress: { en: "In progress", ar: "قيد التنفيذ" },
  remediationLifecycleReadyRetest: { en: "Ready for retest", ar: "جاهز لإعادة الاختبار" },
  remediationLifecycleClosed: { en: "Closed", ar: "مغلق" },
  remediationLifecycleHumanReview: { en: "Human review", ar: "مراجعة بشرية" },
  remediationRetestLoopTitle: { en: "Failed retest loop", ar: "حلقة إعادة الاختبار الفاشلة" },
  remediationRetestLoopHint: {
    en: "A failed retest returns the item to human review before remediation can restart.",
    ar: "إعادة الاختبار الفاشلة تُعيد العنصر إلى المراجعة البشرية قبل إعادة بدء المعالجة.",
  },
  remediationRetestNoteTitle: { en: "Prior retest failure note", ar: "ملاحظة إعادة اختبار فاشلة سابقة" },
  remediationOverdueAlert: { en: "Overdue by", ar: "متأخر بـ" },
  remediationStart: { en: "Start remediation", ar: "بدء المعالجة" },
  remediationMarkReady: { en: "Mark ready for retest", ar: "تعيين جاهز لإعادة الاختبار" },
  remediationRetestPass: { en: "Retest passed", ar: "نجح إعادة الاختبار" },
  remediationRetestFail: { en: "Retest failed", ar: "فشل إعادة الاختبار" },
  remediationActionSuccess: { en: "Remediation updated", ar: "تم تحديث المعالجة" },
  remediationActionError: { en: "Remediation action failed", ar: "فشل إجراء المعالجة" },
  remediationClosedHint: {
    en: "This item is closed. Prior retest history is shown when applicable.",
    ar: "هذا البند مغلق. تُعرض تاريخ إعادة الاختبار السابق عند الانطباق.",
  },
  remediationHumanReviewHint: {
    en: "Item returned to human review after a failed retest.",
    ar: "أُعيد العنصر إلى المراجعة البشرية بعد فشل إعادة الاختبار.",
  },
  remediationDue: { en: "Due", ar: "الموعد" },
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
  mockEqaBoardReadOnly: {
    en: "Read-only oversight view — Board cannot run the simulation.",
    ar: "عرض إشرافي للقراءة فقط — لا يمكن للمجلس تشغيل المحاكاة.",
  },
  mockEqaSimulationBadge: {
    en: "Simulation — not a formal result",
    ar: "محاكاة — ليست نتيجة رسمية",
  },
  mockEqaSearch: { en: "Search standards…", ar: "بحث في المعايير…" },
  mockEqaEmptyTitle: { en: "No standards in simulation", ar: "لا معايير في المحاكاة" },
  mockEqaEmptyDescription: {
    en: "Run a simulation to surface per-standard ratings.",
    ar: "شغّل محاكاة لعرض درجات كل معيار.",
  },
  mockEqaErrorDemo: {
    en: "Could not load mock-EQA simulation (demo error state).",
    ar: "تعذّر تحميل محاكاة EQA التجريبية (حالة خطأ تجريبية).",
  },
  mockEqaDomain: { en: "Domain", ar: "النطاق" },
  mockEqaRating: { en: "Simulated rating", ar: "الدرجة المحاكية" },
  mockEqaGaps: { en: "Driving gaps", ar: "الفجوات المؤثرة" },
  mockEqaRunPending: {
    en: "Run a new readiness simulation (demo)",
    ar: "تشغيل محاكاة جاهزية جديدة (تجريبي)",
  },
  mockEqaDetailSubtitle: { en: "Standard rating detail", ar: "تفاصيل درجة المعيار" },
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
  packSubtitle: {
    en: "Bilingual preview of pack contents — references and metadata only, no raw files.",
    ar: "معاينة ثنائية اللغة لمحتويات الحزمة — مراجع وبيانات وصفية فقط، دون ملفات خام.",
  },
  packBilingualTitle: {
    en: "Bilingual assessment title",
    ar: "عنوان التقييم ثنائي اللغة",
  },
  packTitleEn: { en: "English title", ar: "العنوان بالإنجليزية" },
  packTitleAr: { en: "Arabic title", ar: "العنوان بالعربية" },
  packPreviewTitle: { en: "Standard sections preview", ar: "معاينة أقسام المعايير" },
  packPreviewSearch: { en: "Search standards…", ar: "بحث في المعايير…" },
  packEmptyTitle: { en: "No standards in pack", ar: "لا معايير في الحزمة" },
  packEmptyDescription: {
    en: "Standards will appear when a pack is generated.",
    ar: "ستظهر المعايير عند توليد الحزمة.",
  },
  packErrorDemo: {
    en: "Could not load evidence pack preview (demo error state).",
    ar: "تعذّر تحميل معاينة حزمة الأدلة (حالة خطأ تجريبية).",
  },
  packGapSummary: { en: "Gap summary", ar: "ملخص الفجوات" },
  packDownloadCta: {
    en: "Download the sample PDF to verify disclaimer and confidentiality footer on every page.",
    ar: "نزّل PDF التجريبي للتحقق من إخلاء المسؤولية وتذييل السرية في كل صفحة.",
  },
  packConfidentialityHeading: { en: "Confidential", ar: "سري" },
  skipToContent: { en: "Skip to content", ar: "تخطي إلى المحتوى" },
  shellLoading: { en: "Loading…", ar: "جاري التحميل…" },
  mainNavLabel: { en: "Main navigation", ar: "التنقل الرئيسي" },
  brandName: { en: "Maya AI", ar: "Maya AI" },
  comingSoon: { en: "Coming soon", ar: "قريباً" },
  expandSidebar: { en: "Expand sidebar", ar: "توسيع الشريط الجانبي" },
  collapseSidebar: { en: "Collapse sidebar", ar: "طي الشريط الجانبي" },
  collapse: { en: "Collapse", ar: "طي" },
  viewControlsLabel: {
    en: "Language and role controls",
    ar: "عناصر اللغة والدور",
  },
  demoDisabledHint: {
    en: "Demo UI — job wired in backend",
    ar: "واجهة تجريبية — الوظيفة مربوطة في الخادم",
  },
  closeToast: { en: "Close notification", ar: "إغلاق الإشعار" },
  findingStatusGapConfirmed: { en: "Gap confirmed", ar: "فجوة مؤكدة" },
  findingStatusNoGap: { en: "No gap", ar: "لا توجد فجوة" },
  findingSourceHuman: { en: "Human review", ar: "مراجعة بشرية" },
  findingsWhatsNextAction: {
    en: "Review pending AI draft findings",
    ar: "مراجعة مسودات النتائج المعلقة",
  },
  journeyStateCleared: { en: "Cleared", ar: "مكتمل" },
  journeyStateInProgress: { en: "In progress", ar: "قيد التنفيذ" },
  journeyStateNotStarted: { en: "Not started", ar: "لم يبدأ" },
  journeyStateBlocked: { en: "Blocked", ar: "متوقف" },
  gapSourceConfirmedGap: {
    en: "Confirmed gap status",
    ar: "حالة فجوة مؤكدة",
  },
  gapSourceHumanFinding: {
    en: "Human-reviewed finding",
    ar: "نتيجة مراجَعة بشرية",
  },
  gapSourcePendingReview: {
    en: "Pending human review",
    ar: "بانتظار المراجعة البشرية",
  },
  gapSourceNotStarted: { en: "Not started", ar: "لم يبدأ" },
  gapSourceWpNonConformance: {
    en: "Working-paper non-conformance",
    ar: "عدم مطابقة في أوراق العمل",
  },
  gapSourceWpUnreviewed: {
    en: "Working-paper unreviewed",
    ar: "أوراق عمل غير مراجَعة",
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
  findingsTitle: { en: "Findings & human review", ar: "النتائج والمراجعة البشرية" },
  findingsSubtitle: {
    en: "AI draft findings await your decision before they become final conclusions.",
    ar: "مسودات النتائج من الذكاء الاصطناعي بانتظار قرارك قبل أن تصبح نتائج نهائية.",
  },
  findingsLocation: {
    en: "Findings queue — human review",
    ar: "قائمة النتائج — المراجعة البشرية",
  },
  findingsPendingCount: { en: "Pending review", ar: "بانتظار المراجعة" },
  findingsSearch: { en: "Search findings…", ar: "بحث في النتائج…" },
  findingsEmptyTitle: { en: "No findings to review", ar: "لا توجد نتائج للمراجعة" },
  findingsEmptyDescription: {
    en: "When AI flags a gap, the draft appears here for human review.",
    ar: "عندما يحدد الذكاء الاصطناعي فجوة، تظهر المسودة هنا للمراجعة البشرية.",
  },
  findingsErrorDemo: {
    en: "Could not load findings (demo error state).",
    ar: "تعذر تحميل النتائج (حالة خطأ تجريبية).",
  },
  findingSource: { en: "Source", ar: "المصدر" },
  findingAge: { en: "Age", ar: "العمر" },
  findingDetailSubtitle: { en: "Assessment item", ar: "عنصر التقييم" },
  findingDraftTitle: { en: "AI draft", ar: "مسودة الذكاء الاصطناعي" },
  findingConclusionTitle: { en: "Final conclusion", ar: "النتيجة النهائية" },
  findingProvenanceTitle: { en: "AI provenance", ar: "مصدر الذكاء الاصطناعي" },
  findingPromptVersion: { en: "Prompt", ar: "الموجه" },
  findingRubricVersion: { en: "Rubric", ar: "المعيار" },
  findingModelAdapter: { en: "Model", ar: "النموذج" },
  findingTimestamp: { en: "Generated", ar: "تاريخ التوليد" },
  findingInputSummary: { en: "Redacted input summary", ar: "ملخص مدخلات مُنقّح" },
  findingAccept: { en: "Accept draft", ar: "قبول المسودة" },
  findingEdit: { en: "Edit", ar: "تعديل" },
  findingEditAccept: { en: "Save & accept", ar: "حفظ وقبول" },
  findingReject: { en: "Reject — no gap", ar: "رفض — لا فجوة" },
  findingEditLabel: { en: "Edited conclusion", ar: "النتيجة المعدّلة" },
  findingActionSuccess: { en: "Review recorded", ar: "تم تسجيل المراجعة" },
  findingAcceptedHint: {
    en: "Draft promoted via resolveHumanReview (demo UI only).",
    ar: "تمت ترقية المسودة عبر resolveHumanReview (واجهة تجريبية فقط).",
  },
  findingRejectedHint: {
    en: "Draft dismissed — item marked reviewed with no gap.",
    ar: "تم رفض المسودة — العنصر مُعلَّم بلا فجوة.",
  },
  findingActionError: { en: "Review action failed", ar: "فشل إجراء المراجعة" },
  findingReadOnlyHint: {
    en: "This conclusion was recorded through human review.",
    ar: "سُجِلت هذه النتيجة عبر المراجعة البشرية.",
  },
  findingBoardHint: {
    en: "Board view is read-only — switch to an operational role to review drafts.",
    ar: "عرض المجلس للقراءة فقط — انتقل إلى دور تشغيلي لمراجعة المسودات.",
  },
  closePanel: { en: "Close panel", ar: "إغلاق اللوحة" },
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

const GAP_SOURCE_LABEL_KEYS: Record<string, keyof typeof UI_LABELS> = {
  confirmed_gap_status: "gapSourceConfirmedGap",
  human_reviewed_finding: "gapSourceHumanFinding",
  pending_human_review: "gapSourcePendingReview",
  not_started: "gapSourceNotStarted",
  wp_non_conformance: "gapSourceWpNonConformance",
  wp_unreviewed: "gapSourceWpUnreviewed",
};

export function gapSourceLabel(source: string, locale: Locale): string {
  const key = GAP_SOURCE_LABEL_KEYS[source];
  if (key) return uiLabel(key, locale);
  return source.replace(/_/g, " ");
}
