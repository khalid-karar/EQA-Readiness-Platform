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
  readinessTitle: {
    en: "Readiness — weighted conformance",
    ar: "الجاهزية — مطابقة مرجّحة",
  },
  cockpitTitle: {
    en: "Readiness cockpit",
    ar: "قمرة الجاهزية",
  },
  cockpitSubtitle: {
    en: "Indicative readiness and completion at a glance — domain heat map and operational queue.",
    ar: "جاهزية إرشادية واكتمال في لمحة — خريطة حرارية للمجالات وقائمة تشغيلية.",
  },
  cockpitLocation: {
    en: "Cockpit overview",
    ar: "نظرة قمرة الجاهزية",
  },
  cockpitIndicativeReadiness: {
    en: "Indicative readiness",
    ar: "جاهزية إرشادية",
  },
  cockpitCompletion: {
    en: "Assessment completion",
    ar: "اكتمال التقييم",
  },
  cockpitReadinessDisclaimer: {
    en: "Indicative readiness only — not an assessment verdict. The independent external assessor decides conformance during EQA.",
    ar: "جاهزية إرشادية فقط — وليست حكماً بالتقييم. المقيّم الخارجي المستقل يقرر المطابقة أثناء EQA.",
  },
  cockpitHeatMapTitle: {
    en: "Domain heat map",
    ar: "خريطة حرارية للمجالات",
  },
  cockpitHeatMapSubtitle: {
    en: "Readiness by domain, principle, and standard. Domain % is the average indicative score.",
    ar: "الجاهزية حسب المجال والمبدأ والمعيار. نسبة المجال هي متوسط الدرجة الإرشادية.",
  },
  cockpitDomainStandards: {
    en: "standards",
    ar: "معيار",
  },
  readinessHint: {
    en: "Weighted blend of item statuses, human-reviewed findings, and working-paper conformance (including unreviewed items).",
    ar: "مزيج مرجّح من حالات العناصر والنتائج المراجَعة ومطابقة أوراق العمل (بما فيها غير المراجَع).",
  },
  assessorSimulationScore: {
    en: "Assessor-simulation score",
    ar: "درجة محاكاة المقيّم",
  },
  readinessLensNote: {
    en: "Computed differently from dashboard weighted conformance — models external-assessor-style scoring from the same synthetic inputs.",
    ar: "تُحسب بطريقة مختلفة عن مطابقة لوحة الجاهزية المرجّحة — نمذجة تقييم بأسلوب المقيّم الخارجي من نفس مدخلات العرض التجريبي.",
  },
  heatMapTitle: { en: "Conformance heat map", ar: "خريطة حرارية للمطابقة" },
  heatMapSubtitle: {
    en: "Domain → principle → standard. Click a cell for detail.",
    ar: "نطاق ← مبدأ ← معيار. انقر على خلية للتفاصيل.",
  },
  locale: { en: "Language", ar: "اللغة" },
  viewAs: { en: "View as", ar: "العرض كـ" },
  roleCae: { en: "CAE", ar: "الرئيس التنفيذي للتدقيق" },
  roleAuditStaff: { en: "Audit Staff", ar: "فريق التدقيق" },
  roleBoard: { en: "Board", ar: "المجلس" },
  localeEnglish: { en: "English", ar: "الإنجليزية" },
  localeArabic: { en: "Arabic", ar: "العربية" },
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
    en: "Workspace for gap closure — reassign owners, attach evidence, and drive retest.",
    ar: "مساحة عمل لإغلاق الفجوات — إعادة تعيين المسؤولين، إرفاق الأدلة، وإدارة إعادة الاختبار.",
  },
  remediationWorkspaceTitle: {
    en: "Gap workspace",
    ar: "مساحة عمل الفجوة",
  },
  remediationWorkspaceSelectHint: {
    en: "Select a gap to manage remediation, evidence, and retest.",
    ar: "اختر فجوة لإدارة المعالجة والأدلة وإعادة الاختبار.",
  },
  remediationWorkspaceEmpty: {
    en: "Select a remediation item from the list.",
    ar: "اختر بند معالجة من القائمة.",
  },
  remediationReassignOwner: { en: "Reassign owner", ar: "إعادة تعيين المسؤول" },
  remediationSavePlan: { en: "Save plan", ar: "حفظ الخطة" },
  remediationPlanUpdated: { en: "Remediation plan saved", ar: "تم حفظ خطة المعالجة" },
  remediationClosureEvidenceTitle: {
    en: "Closure evidence",
    ar: "أدلة الإغلاق",
  },
  remediationClosureEvidenceHint: {
    en: "Evidence linked to this assessment item (scan gate applies on upload).",
    ar: "أدلة مرتبطة بعنصر التقييم هذا (بوابة الفحص تنطبق عند الرفع).",
  },
  remediationNoLinkedEvidence: {
    en: "No evidence linked yet.",
    ar: "لا أدلة مرتبطة بعد.",
  },
  remediationUploadEvidence: { en: "Upload evidence", ar: "رفع دليل" },
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
  remediationOverdueAlert: {
    en: "Past due — review the action plan with the owner.",
    ar: "تجاوز الموعد — راجع خطة العمل مع المسؤول.",
  },
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
    en: "Assessor-simulation score",
    ar: "درجة محاكاة المقيّم",
  },
  mockEqaProjectedPreview: {
    en: "Projected preview — not yet formally run",
    ar: "معاينة متوقعة — لم تُجرَ رسمياً بعد",
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
  mockEqaRunSuccess: {
    en: "Simulation complete — results persisted",
    ar: "اكتملت المحاكاة — تم حفظ النتائج",
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
    en: "Assessor-simulation score",
    ar: "درجة محاكاة المقيّم",
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
  packGenerateSuccess: {
    en: "Evidence pack generated — ready to download",
    ar: "تم إنشاء حزمة الأدلة — جاهزة للتنزيل",
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
  assessmentTitle: {
    en: "Scope & self-assessment",
    ar: "النطاق والتقييم الذاتي",
  },
  standardsWorkspaceTitle: {
    en: "Standards workspace",
    ar: "مساحة المعايير",
  },
  standardsWorkspaceSubtitle: {
    en: "Domain → principle → standard navigator with readiness status. Open a standard for detail.",
    ar: "متصفح المجال ← المبدأ ← المعيار مع حالة الجاهزية. افتح معياراً للتفاصيل.",
  },
  standardsWorkspaceLocation: {
    en: "Standards navigator",
    ar: "متصفح المعايير",
  },
  standardsWorkspaceNavigatorTitle: {
    en: "Standards tree",
    ar: "شجرة المعايير",
  },
  standardsWorkspaceFiltersLabel: {
    en: "Filter standards",
    ar: "تصفية المعايير",
  },
  standardsWorkspaceFilterGaps: {
    en: "Gaps only",
    ar: "الفجوات فقط",
  },
  standardsWorkspaceFilterAssigned: {
    en: "Assigned to me",
    ar: "مسند إليّ",
  },
  standardsWorkspaceFilterUnanswered: {
    en: "Unanswered",
    ar: "بدون إجابة",
  },
  standardsWorkspaceTotalCount: {
    en: "{total} standards",
    ar: "{total} معيار",
  },
  standardsWorkspaceFilteredCount: {
    en: "{visible} of {total} standards",
    ar: "{visible} من {total} معيار",
  },
  standardsWorkspaceEmptyFilters: {
    en: "No standards match the active filters.",
    ar: "لا معايير تطابق المرشحات النشطة.",
  },
  standardsWorkspaceResponses: {
    en: "responses",
    ar: "استجابات",
  },
  standardsWorkspaceOwner: {
    en: "Owner",
    ar: "المسؤول",
  },
  standardsWorkspaceOwnerUnset: {
    en: "Not set",
    ar: "غير محدد",
  },
  standardsWorkspaceAssignmentNote: {
    en: "Standard-level owner assignment is read-only here. Remediation owners are shown when a gap plan exists. A dedicated standard-assignment data model is required for inline assignment.",
    ar: "تعيين مسؤول على مستوى المعيار للقراءة فقط هنا. تُعرض مسؤوليات المعالجة عند وجود خطة فجوة. يلزم نموذج بيانات مخصص لتعيين المعيار مباشرة.",
  },
  standardsWorkspaceAssignmentNoteTitle: {
    en: "Owner assignment",
    ar: "تعيين المسؤول",
  },
  assessmentSubtitle: {
    en: "Rate each standard against the pinned content pack. Responses stay bound to that version.",
    ar: "قيّم كل معيار مقابل حزمة المحتوى المثبتة. تبقى الاستجابات مرتبطة بتلك النسخة.",
  },
  assessmentLocation: {
    en: "Questionnaire — scope & self-assess",
    ar: "الاستبيان — النطاق والتقييم الذاتي",
  },
  assessmentProgress: { en: "Standards started", ar: "معايير بدأت" },
  assessmentItems: { en: "Responses", ar: "الاستجابات" },
  assessmentSearch: { en: "Search standards…", ar: "بحث في المعايير…" },
  assessmentEmptyTitle: {
    en: "No standards in scope",
    ar: "لا معايير في النطاق",
  },
  assessmentEmptyDescription: {
    en: "When an assessment scope is defined, standards appear here for self-rating.",
    ar: "عند تحديد نطاق التقييم، تظهر المعايير هنا للتقييم الذاتي.",
  },
  assessmentErrorDemo: {
    en: "Could not load assessment (demo error state).",
    ar: "تعذر تحميل التقييم (حالة خطأ تجريبية).",
  },
  assessmentContentPack: {
    en: "Pinned content pack",
    ar: "حزمة المحتوى المثبتة",
  },
  assessmentPinNote: {
    en: "Every response is stored against this pack version and content hash — not the live catalog.",
    ar: "تُخزَّن كل استجابة مقابل نسخة الحزمة وهاش المحتوى — وليس الكتالوج المباشر.",
  },
  assessmentPinnedVersion: {
    en: "Pinned version",
    ar: "النسخة المثبتة",
  },
  assessmentDetailSubtitle: { en: "Assessment item", ar: "عنصر التقييم" },
  assessmentQuestionTitle: { en: "Question", ar: "السؤال" },
  assessmentCurrentResponse: { en: "Current response", ar: "الاستجابة الحالية" },
  assessmentNoResponse: { en: "Not yet answered", ar: "لم تُجب بعد" },
  assessmentRespondedBy: { en: "Responded by", ar: "أجاب" },
  assessmentRubricTitle: { en: "Rubric levels", ar: "مستويات المعيار" },
  assessmentHistoryTitle: { en: "Response history", ar: "سجل الاستجابات" },
  assessmentAnswer: { en: "Answer", ar: "الإجابة" },
  assessmentWhatsNextAction: {
    en: "Complete self-assessment for remaining standards",
    ar: "أكمل التقييم الذاتي للمعايير المتبقية",
  },
  assessmentBoardHint: {
    en: "Board view — self-assessment responses are read-only.",
    ar: "عرض المجلس — استجابات التقييم الذاتي للقراءة فقط.",
  },
  assessmentSubmit: { en: "Submit response", ar: "إرسال الاستجابة" },
  assessmentSubmitSuccess: {
    en: "Response recorded",
    ar: "تم تسجيل الاستجابة",
  },
  assessmentNoteLabel: { en: "Note (optional)", ar: "ملاحظة (اختياري)" },
  assessmentSelectLevel: {
    en: "Select rubric level",
    ar: "اختر مستوى المعيار",
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
  evidenceTitle: {
    en: "Evidence library",
    ar: "مكتبة الأدلة",
  },
  evidenceSubtitle: {
    en: "Uploaded files stay quarantined until malware scan clears them for download and pack export.",
    ar: "تبقى الملفات المرفوعة في الحجر حتى يُزيل فحص البرمجيات الخبيثة الحجر للتنزيل وتصدير الحزمة.",
  },
  evidenceLibrarySubtitle: {
    en: "Manage and reuse tenant evidence — scan status and standard mappings across the assessment.",
    ar: "إدارة وإعادة استخدام أدلة المستأجر — حالة الفحص وربط المعايير عبر التقييم.",
  },
  evidenceLibrarySecondaryBanner: {
    en: "Secondary store — overview and reuse",
    ar: "مخزن ثانوي — نظرة عامة وإعادة استخدام",
  },
  evidenceLibrarySecondaryBody: {
    en: "Upload and attach evidence inline from Assessment (primary path). This library lists all tenant uploads for review and cross-standard reuse.",
    ar: "ارفع واربط الأدلة مباشرة من التقييم (المسار الأساسي). تعرض هذه المكتبة جميع رفوعات المستأجر للمراجعة وإعادة الاستخدام عبر المعايير.",
  },
  evidenceLibraryAttachLink: {
    en: "Go to Assessment — inline attach",
    ar: "انتقل إلى التقييم — ربط مباشر",
  },
  evidenceLibraryPanelTitle: {
    en: "Evidence detail",
    ar: "تفاصيل الدليل",
  },
  evidenceLibrarySelectHint: {
    en: "Select a row to view scan status, standard mappings, and download options.",
    ar: "اختر صفاً لعرض حالة الفحص وربط المعايير وخيارات التنزيل.",
  },
  evidenceLibraryStandardsHeading: {
    en: "Mapped standards",
    ar: "المعايير المرتبطة",
  },
  evidenceLibraryStandardsColumn: {
    en: "Standards",
    ar: "المعايير",
  },
  evidenceLibraryFileColumn: {
    en: "File",
    ar: "الملف",
  },
  evidenceLibraryReusedBadge: {
    en: "Reused",
    ar: "مُعاد الاستخدام",
  },
  evidenceLibraryReusedSummary: {
    en: "reused across standards",
    ar: "مُعاد استخدامها عبر المعايير",
  },
  evidenceLibraryReuseHeading: {
    en: "Reuse across standards",
    ar: "إعادة الاستخدام عبر المعايير",
  },
  evidenceLibraryReuseBody: {
    en: "Link this cleared file to another standard from Assessment inline attach. Mappings are stored on the evidence links array at upload time.",
    ar: "اربط هذا الملف النظيف بمعيار آخر من الربط المباشر في التقييم. تُخزَّن الروابط في مصفوفة links عند الرفع.",
  },
  evidenceLocation: {
    en: "Evidence library — scan gate",
    ar: "مكتبة الأدلة — بوابة الفحص",
  },
  evidenceType: { en: "Type", ar: "النوع" },
  evidenceRef: { en: "Evidence ref", ar: "مرجع الدليل" },
  evidenceScanStatus: { en: "Scan status", ar: "حالة الفحص" },
  evidenceSearch: { en: "Search evidence…", ar: "بحث في الأدلة…" },
  evidenceEmptyTitle: { en: "No evidence uploaded", ar: "لا أدلة مرفوعة" },
  evidenceEmptyDescription: {
    en: "When auditors upload files against standards, they appear here with scan status.",
    ar: "عندما يرفع المدققون ملفات مقابل المعايير، تظهر هنا مع حالة الفحص.",
  },
  evidenceErrorDemo: {
    en: "Could not load evidence (demo error state).",
    ar: "تعذر تحميل الأدلة (حالة خطأ تجريبية).",
  },
  evidenceQuarantineBanner: {
    en: "Quarantine-until-cleared gate",
    ar: "بوابة الحجر حتى الإزالة",
  },
  evidenceQuarantineBannerBody: {
    en: "Files are not downloadable or linkable in working papers until the background scan marks them clean.",
    ar: "لا يمكن تنزيل الملفات أو ربطها في أوراق العمل حتى يُعلِم الفحص الخلفي أنها نظيفة.",
  },
  evidenceScanSummary: { en: "Scan summary", ar: "ملخص الفحص" },
  evidenceClearedLabel: { en: "cleared", ar: "مُزال الحجر" },
  evidenceQuarantinedLabel: { en: "quarantined", ar: "في الحجر" },
  evidenceDetailSubtitle: { en: "Evidence item", ar: "عنصر دليل" },
  evidenceSize: { en: "File size", ar: "حجم الملف" },
  evidenceUploaded: { en: "Uploaded", ar: "تاريخ الرفع" },
  evidenceLinks: { en: "Linked items", ar: "العناصر المرتبطة" },
  evidenceDownload: { en: "Download file", ar: "تنزيل الملف" },
  evidenceUpload: { en: "Upload evidence", ar: "رفع دليل" },
  evidenceUploadHint: {
    en: "PDF or image files only. Files stay quarantined until malware scan clears them.",
    ar: "ملفات PDF أو صور فقط. تبقى الملفات في الحجر حتى يُزيل فحص البرمجيات الخبيثة الحجر.",
  },
  evidenceUploadStandard: { en: "Standard", ar: "المعيار" },
  evidenceUploadQuestion: { en: "Question ID", ar: "معرّف السؤال" },
  evidenceUploadFile: { en: "File", ar: "الملف" },
  evidenceUploadSuccess: {
    en: "Evidence uploaded — scan complete",
    ar: "تم رفع الدليل — اكتمل الفحص",
  },
  evidenceUploadInfected: {
    en: "Upload blocked — malware detected",
    ar: "تم حظر الرفع — اكتُشفت برمجيات خبيثة",
  },
  evidenceDownloadBlocked: {
    en: "Download blocked — file not cleared",
    ar: "التنزيل محظور — الملف لم يُزَل الحجر عنه",
  },
  evidenceQuarantineGate: {
    en: "Quarantine gate: download stays disabled until scan status is cleared.",
    ar: "بوابة الحجر: يبقى التنزيل معطّلاً حتى تصبح حالة الفحص «مُزال الحجر».",
  },
  evidenceWhatsNextAction: {
    en: "Wait for malware scan on quarantined uploads",
    ar: "انتظر فحص البرمجيات الخبيثة للملفات في الحجر",
  },
  evidenceBoardHint: {
    en: "Board view — evidence metadata is read-only; downloads require an operational role.",
    ar: "عرض المجلس — بيانات الأدلة للقراءة فقط؛ التنزيل يتطلب دور تشغيلي.",
  },
  engagementsTitle: {
    en: "Sampled engagement",
    ar: "المهمة المختارة",
  },
  engagementsLocation: {
    en: "Engagements — working-paper entry",
    ar: "المهام — مدخل أوراق العمل",
  },
  engagementsEmptyDescription: {
    en: "No completed engagements are available for working-paper review in this tenant.",
    ar: "لا مهام مكتملة متاحة لمراجعة أوراق العمل في هذا المستأجر.",
  },
  engagementsSampleRationale: {
    en: "Sample rationale",
    ar: "مبرر العينة",
  },
  engagementsItemsReviewed: {
    en: "reviewed",
    ar: "مُراجَع",
  },
  engagementsTestPaper: {
    en: "Test checklist items",
    ar: "اختبار عناصر القائمة",
  },
  engagementsOpenQuestionsTitle: {
    en: "Open questions (not forced in this slice)",
    ar: "أسئلة مفتوحة (غير مُلزمة في هذه الشريحة)",
  },
  engagementsOpenQuestionGrain: {
    en: "Working-paper review page still loads the first completed engagement only — multi-engagement drill-down is not wired yet.",
    ar: "صفحة مراجعة أوراق العمل ما زالت تحمّل أول مهمة مكتملة فقط — التعمق متعدد المهام غير موصول بعد.",
  },
  engagementsOpenQuestionStandardDetail: {
    en: "Standard-detail working-paper tests (P3 workspace) are not on main — standard pills link to Assessment until that ships.",
    ar: "اختبارات أوراق العمل في تفاصيل المعيار (مساحة P3) غير موجودة على main — حبوب المعيار ترتبط بالتقييم حتى ذلك.",
  },
  engagementsOpenQuestionNav: {
    en: "Engagements is a new nav entry alongside Working Papers — merge vs replace is undecided.",
    ar: "المهام عنصر تنقل جديد بجانب أوراق العمل — الدمج مقابل الاستبدال غير محسوم.",
  },
  adminActionsTitle: {
    en: "Admin actions",
    ar: "إجراءات إدارية",
  },
  adminActionsSubtitle: {
    en: "Run tenant-scoped jobs — results appear on existing Mock-EQA and Evidence Pack screens.",
    ar: "تشغيل مهام المستأجر — تظهر النتائج في شاشات محاكاة EQA وحزمة الأدلة الحالية.",
  },
  adminRunMockEqa: {
    en: "Run Mock-EQA simulation",
    ar: "تشغيل محاكاة EQA",
  },
  adminRunMockEqaHint: {
    en: "Queues the existing mock-EQA job. View results on",
    ar: "يضع مهمة محاكاة EQA الحالية في الطابور. اعرض النتائج في",
  },
  adminViewMockEqa: {
    en: "Mock-EQA screen",
    ar: "شاشة محاكاة EQA",
  },
  adminGeneratePack: {
    en: "Generate evidence pack",
    ar: "إنشاء حزمة الأدلة",
  },
  adminGeneratePackHint: {
    en: "Queues the existing evidence-pack export job. Preview on",
    ar: "يضع مهمة تصدير حزمة الأدلة في الطابور. المعاينة في",
  },
  adminViewPack: {
    en: "Evidence Pack screen",
    ar: "شاشة حزمة الأدلة",
  },
  adminDownloadPack: {
    en: "Download generated pack",
    ar: "تنزيل الحزمة المُنشأة",
  },
  adminMockEqaSuccess: {
    en: "Mock-EQA simulation queued",
    ar: "تم وضع محاكاة EQA في الطابور",
  },
  adminMockEqaError: {
    en: "Mock-EQA simulation failed",
    ar: "فشلت محاكاة EQA",
  },
  adminPackSuccess: {
    en: "Evidence pack export queued",
    ar: "تم وضع تصدير حزمة الأدلة في الطابور",
  },
  adminPackError: {
    en: "Evidence pack export failed",
    ar: "فشل تصدير حزمة الأدلة",
  },
  adminBoardHint: {
    en: "Board view — admin actions require an operational role.",
    ar: "عرض المجلس — الإجراءات الإدارية تتطلب دوراً تشغيلياً.",
  },
  adminOpenQuestionNote: {
    en: "These buttons reuse POST /api/actions/run-mock-eqa and generate-evidence-pack — no new job types.",
    ar: "هذه الأزرار تعيد استخدام run-mock-eqa و generate-evidence-pack — لا أنواع مهام جديدة.",
  },
  wpTitle: {
    en: "Working-paper review",
    ar: "مراجعة أوراق العمل",
  },
  wpSubtitle: {
    en: "Test whether documented methodology was followed — each row is a pinned checklist item.",
    ar: "اختبر ما إذا كانت المنهجية الموثَّقة قد اُتبعت — كل صف عنصر في قائمة فحص مثبتة.",
  },
  wpLocation: {
    en: "Working-paper review — methodology test",
    ar: "مراجعة أوراق العمل — اختبار المنهجية",
  },
  wpEngagement: { en: "Engagement / paper", ar: "المهمة / الورقة" },
  wpChecklistItem: { en: "Checklist item", ar: "عنصر القائمة" },
  wpSearch: { en: "Search checklist items…", ar: "بحث في عناصر القائمة…" },
  wpEmptyTitle: { en: "No checklist items in sample", ar: "لا عناصر قائمة في العيّنة" },
  wpEmptyDescription: {
    en: "When a completed engagement is sampled, checklist items appear here for conformance review.",
    ar: "عند أخذ عيّنة من مهمة مكتملة، تظهر عناصر القائمة هنا لمراجعة المطابقة.",
  },
  wpErrorDemo: {
    en: "Could not load working papers (demo error state).",
    ar: "تعذر تحميل أوراق العمل (حالة خطأ تجريبية).",
  },
  wpUnreviewedBanner: {
    en: "Unreviewed checklist items",
    ar: "عناصر القائمة غير المراجَعة",
  },
  wpUnreviewedRollup: {
    en: "checklist items still unreviewed",
    ar: "عنصر قائمة لم يُراجَع بعد",
  },
  wpReviewedRollup: { en: "items reviewed", ar: "عنصر روجِع" },
  wpConformantLabel: { en: "conformant", ar: "مطابق" },
  wpPartialLabel: { en: "partial", ar: "جزئي" },
  wpNonConformantLabel: { en: "non-conformant", ar: "غير مطابق" },
  wpDetailSubtitle: { en: "Checklist item", ar: "عنصر القائمة" },
  wpWorkingPaper: { en: "Working paper", ar: "ورقة العمل" },
  wpPinnedChecklist: { en: "Pinned checklist", ar: "قائمة الفحص المثبتة" },
  wpRecorded: { en: "Recorded", ar: "تاريخ التسجيل" },
  wpReviewerNote: { en: "Reviewer note", ar: "ملاحظة المراجع" },
  wpRecordConformance: { en: "Record conformance", ar: "تسجيل المطابقة" },
  wpRecordHint: {
    en: "Conformance is recorded against the pinned Step 5 checklist version.",
    ar: "يُسجَّل المطابقة مقابل نسخة قائمة الفحص المثبتة من الخطوة 5.",
  },
  wpRecordSuccess: {
    en: "Conformance recorded",
    ar: "تم تسجيل المطابقة",
  },
  wpConformanceSelect: { en: "Conformance", ar: "المطابقة" },
  wpUnreviewedGate: {
    en: "Unreviewed items block methodology clearance and drive readiness penalties until reviewed.",
    ar: "العناصر غير المراجَعة تمنع إغلاق المنهجية وتخفض الجاهزية حتى تُراجَع.",
  },
  wpWhatsNextAction: {
    en: "Review unreviewed working-paper checklist items",
    ar: "راجع عناصر قائمة أوراق العمل غير المراجَعة",
  },
  wpBoardHint: {
    en: "Board view — working-paper conformance is read-only.",
    ar: "عرض المجلس — مطابقة أوراق العمل للقراءة فقط.",
  },
  contentPin: { en: "Content pin", ar: "تثبيت المحتوى" },
  standardDetailLocation: {
    en: "Standard detail",
    ar: "تفاصيل المعيار",
  },
  standardDetailReadOnlyTitle: {
    en: "Read-only view",
    ar: "عرض للقراءة فقط",
  },
  standardDetailReadOnlyBody: {
    en: "This screen shows the current state of one standard. No edits or actions are available on this step.",
    ar: "يعرض هذا الشاشة الحالة الحالية لمعيار واحد. لا تتوفر تعديلات أو إجراءات في هذه الخطوة.",
  },
  standardDetailRunGapFlag: {
    en: "Run AI gap-flag",
    ar: "تشغيل علامة الفجوة بالذكاء الاصطناعي",
  },
  standardDetailGapFlagHint: {
    en: "Requires cleared evidence. Produces a draft finding only — not a final conclusion.",
    ar: "يتطلب أدلة مُزال حجرها. ينتج مسودة فقط — وليس استنتاجاً نهائياً.",
  },
  standardDetailGapFlagSuccess: {
    en: "AI draft finding queued",
    ar: "تم إنشاء مسودة نتيجة من الذكاء الاصطناعي",
  },
  standardDetailGapFlagError: {
    en: "Gap-flag failed",
    ar: "فشل وضع علامة الفجوة",
  },
  standardDetailDismissHint: {
    en: "Rejecting a draft records reviewed_no_gap — the item is dismissed, not closed.",
    ar: "رفض المسودة يسجّل reviewed_no_gap — يُستبعد العنصر ولا يُغلق.",
  },
  standardDetailAssignRemediation: {
    en: "Assign remediation",
    ar: "تعيين المعالجة",
  },
  standardDetailRemediationSuccess: {
    en: "Remediation plan assigned",
    ar: "تم تعيين خطة المعالجة",
  },
  standardDetailRemediationError: {
    en: "Remediation assignment failed",
    ar: "فشل تعيين المعالجة",
  },
  standardDetailRemediationLinked: {
    en: "Remediation owner",
    ar: "مسؤول المعالجة",
  },
  standardDetailDerivedStatus: {
    en: "Derived status",
    ar: "الحالة المشتقة",
  },
  standardDetailRequirements: {
    en: "Requirements",
    ar: "المتطلبات",
  },
  standardDetailRequirementsHint: {
    en: "Each assessment question is the grain — evidence and AI drafts are shown inline per requirement.",
    ar: "كل سؤال تقييم هو وحدة العرض — تُعرض الأدلة ومسودات الذكاء الاصطناعي ضمن كل متطلب.",
  },
  standardDetailAnswer: { en: "Self-assessment answer", ar: "إجابة التقييم الذاتي" },
  standardDetailNote: { en: "Note", ar: "ملاحظة" },
  standardDetailEvidence: { en: "Attached evidence", ar: "الأدلة المرفقة" },
  standardDetailNoEvidence: {
    en: "No evidence linked to this requirement.",
    ar: "لا أدلة مرتبطة بهذا المتطلب.",
  },
  standardDetailAiDraftTitle: {
    en: "AI draft finding",
    ar: "مسودة نتيجة من الذكاء الاصطناعي",
  },
  standardDetailAiDraftDisclaimer: {
    en: "Draft work product — not a final conclusion. A human reviewer must disposition this before it affects readiness.",
    ar: "منتج عمل مسودة — وليس استنتاجاً نهائياً. يجب على مراجع بشري البت فيها قبل أن تؤثر على الجاهزية.",
  },
  standardDetailFinalConclusion: {
    en: "Human final conclusion",
    ar: "الاستنتاج النهائي البشري",
  },
  standardDetailWpHint: {
    en: "Working-paper checklist conformance recorded against the pinned Step 5 content.",
    ar: "مطابقة قائمة فحص أوراق العمل المسجَّلة مقابل محتوى الخطوة 5 المثبت.",
  },
  standardDetailDecisionTrail: {
    en: "Decision trail",
    ar: "مسار القرار",
  },
  standardDetailDecisionTrailHint: {
    en: "Who did what and when — from the tenant audit log for this standard's items.",
    ar: "من فعل ماذا ومتى — من سجل تدقيق المستأجر لعناصر هذا المعيار.",
  },
  standardDetailDecisionTrailEmpty: {
    en: "No decision trail entries yet",
    ar: "لا إدخالات في مسار القرار بعد",
  },
  standardDetailBoardHint: {
    en: "Board view — standard detail is read-only; switch to an operational role for review tasks.",
    ar: "عرض المجلس — تفاصيل المعيار للقراءة فقط؛ انتقل إلى دور تشغيلي لمهام المراجعة.",
  },
  closePanel: { en: "Close panel", ar: "إغلاق اللوحة" },
};

export function uiLabel(key: keyof typeof UI_LABELS, locale: Locale): string {
  const entry = UI_LABELS[key];
  if (!entry) return key;
  return entry[locale] ?? entry.en;
}

export function roleDisplayLabel(
  role: "cae" | "audit_staff" | "board",
  locale: Locale,
): string {
  switch (role) {
    case "cae":
      return uiLabel("roleCae", locale);
    case "audit_staff":
      return uiLabel("roleAuditStaff", locale);
    case "board":
      return uiLabel("roleBoard", locale);
  }
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
