import type { StandardDetailLoadResult, AuditEntry } from "@eqa/db";
import type { Locale } from "@eqa/content";
import { loadBundledCatalog, resolveChecklistItems } from "@eqa/content";
import type { ItemStatus } from "@eqa/workflows";
import {
  createSeeraDemoAssessmentName,
  createSeeraDemoContentPin,
  createSeeraDemoDraftFindings,
  createSeeraDemoEvidenceMetadata,
  createSeeraDemoFinalConclusions,
  createSeeraDemoResponses,
  createSeeraDemoStatusesByQuestion,
  createSeeraDemoWorkingPaperEngagement,
  renderQuestionnaire,
  ROLE_LABELS,
  SEERA_DEMO_ASSESSMENT_ID,
  SEERA_DEMO_PACK_ID,
  SEERA_DEMO_PACK_VERSION,
  SEERA_DEMO_STANDARDS,
  uxStatusLabel,
  type DashboardRole,
} from "@eqa/workflows";

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
  readonly finalConclusion: string | null;
}

export interface PresentedWpConformanceItem {
  readonly id: string;
  readonly itemText: string;
  readonly workingPaperRef: string;
  readonly workingPaperTitle: string;
  readonly conformanceLabel: string;
  readonly conformanceVariant: "conformant" | "partial" | "gap" | "neutral";
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
  readonly locale: Locale;
  readonly role: DashboardRole;
  readonly roleLabel: string;
  readonly isSummaryView: boolean;
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

function formatBytes(bytes: number, locale: Locale): string {
  const kb = bytes / 1024;
  if (kb < 1024) {
    return locale === "ar"
      ? `${Math.round(kb)} كيلوبايت`
      : `${Math.round(kb)} KB`;
  }
  return locale === "ar"
    ? `${(kb / 1024).toFixed(1)} ميجابايت`
    : `${(kb / 1024).toFixed(1)} MB`;
}

function scanLabels(
  status: "clean" | "quarantined" | "infected",
): { en: string; ar: string } {
  if (status === "clean") {
    return { en: "Scan clear", ar: "فحص نظيف" };
  }
  if (status === "infected") {
    return { en: "Infected", ar: "مصاب" };
  }
  return { en: "Quarantined", ar: "في الحجر" };
}

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
  locale: Locale,
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

function wpConformancePresentation(
  raw: StandardDetailLoadResult["wpConformance"][number],
  locale: Locale,
): PresentedWpConformanceItem {
  let conformanceLabel: string;
  let variant: PresentedWpConformanceItem["conformanceVariant"];
  if (raw.conformance === "conforms") {
    conformanceLabel = locale === "ar" ? "مطابق" : "Conforms";
    variant = "conformant";
  } else if (raw.conformance === "does_not_conform") {
    conformanceLabel = locale === "ar" ? "لا يطابق" : "Does not conform";
    variant = "gap";
  } else if (raw.conformance === "not_applicable") {
    conformanceLabel = locale === "ar" ? "غير قابل للتطبيق" : "Not applicable";
    variant = "neutral";
  } else {
    conformanceLabel = locale === "ar" ? "غير مراجَع" : "Unreviewed";
    variant = "partial";
  }
  return {
    id: `${raw.checklistId}:${raw.itemId}`,
    itemText: locale === "ar" ? raw.itemTextAr : raw.itemTextEn,
    workingPaperRef: raw.workingPaperRef,
    workingPaperTitle: raw.workingPaperTitle,
    conformanceLabel,
    conformanceVariant: variant,
    note: raw.note,
    recordedBy: raw.recordedBy,
    recordedAt: raw.recordedAt,
  };
}

function presentAuditEntry(
  entry: AuditEntry,
  locale: Locale,
): PresentedDecisionTrailEntry {
  const actionLabels: Record<string, { en: string; ar: string }> = {
    create: { en: "Created", ar: "أُنشئ" },
    update: { en: "Updated", ar: "حُدِّث" },
    delete: { en: "Deleted", ar: "حُذف" },
    status_change: { en: "Status changed", ar: "تغيّرت الحالة" },
  };
  const actionLabel =
    locale === "ar"
      ? (actionLabels[entry.action]?.ar ?? entry.action)
      : (actionLabels[entry.action]?.en ?? entry.action);
  let summary = `${entry.entity} · ${entry.entityId}`;
  if (entry.action === "status_change") {
    summary =
      locale === "ar"
        ? `${entry.oldValue ?? "—"} ← ${entry.newValue ?? "—"}`
        : `${entry.oldValue ?? "—"} → ${entry.newValue ?? "—"}`;
  } else if (entry.newValue) {
    try {
      const parsed = JSON.parse(entry.newValue) as Record<string, unknown>;
      if (typeof parsed.draftSummary === "string") {
        summary = parsed.draftSummary;
      } else if (typeof parsed.finalConclusion === "string") {
        summary = parsed.finalConclusion;
      } else if (typeof parsed.action === "string") {
        summary = String(parsed.action);
      }
    } catch {
      summary = entry.newValue.slice(0, 120);
    }
  }
  return {
    id: entry.id,
    occurredAt: entry.occurredAt,
    actorLabel: entry.actorUserId,
    actionLabel,
    summary,
  };
}

export function buildStandardDetailPresentationFromLoad(
  data: StandardDetailLoadResult,
): StandardDetailPresentation {
  const locale = data.locale;
  const role = data.role;
  const questionStatuses = data.requirements.map((r) => r.status);
  const hasOpenDraft = data.requirements.some(
    (r) => r.draftFinding && !r.finalConclusion,
  );
  const wpNonConformant = data.wpConformance.some(
    (w) => w.conformance === "does_not_conform",
  );
  const wpUnreviewed = data.wpConformance.some((w) => w.conformance === null);

  const derivedStatus = deriveStandardStatus({
    questionStatuses,
    hasOpenDraft,
    wpNonConformant,
    wpUnreviewed,
  });

  const requirements: PresentedStandardRequirement[] = data.requirements.map(
    (req) => ({
      questionId: req.questionId,
      questionText:
        locale === "ar" ? req.questionTextAr : req.questionTextEn,
      status: req.status,
      statusLabel: uxStatusLabel(req.status, locale),
      answer: req.answer,
      note: req.note,
      evidence: req.evidence.map((ev) => {
        const scan =
          ev.scanStatus === "clean"
            ? "clean"
            : ev.scanStatus === "infected"
              ? "infected"
              : "quarantined";
        const labels = scanLabels(scan);
        return {
          evidenceId: ev.evidenceId,
          fileName: ev.fileName,
          scanStatus: scan,
          scanLabelEn: labels.en,
          scanLabelAr: labels.ar,
          sizeLabelEn: formatBytes(ev.sizeBytes, "en"),
          sizeLabelAr: formatBytes(ev.sizeBytes, "ar"),
        };
      }),
      draftSummary: req.draftFinding?.draftSummary ?? null,
      finalConclusion: req.finalConclusion?.conclusion ?? null,
    }),
  );

  const decisionTrail = data.decisionTrail.map((e) =>
    presentAuditEntry(e, locale),
  );

  return {
    assessmentId: data.assessmentId,
    assessmentName: data.assessmentName[locale],
    locale,
    role,
    roleLabel: ROLE_LABELS[role][locale],
    isSummaryView: role === "board",
    standardNumber: data.standardNumber,
    standardTitle:
      locale === "ar" ? data.standardTitleAr : data.standardTitleEn,
    domainLabel: `${data.domainNumber} · ${locale === "ar" ? data.domainTitleAr : data.domainTitleEn}`,
    principleLabel: `${data.principleNumber} · ${locale === "ar" ? data.principleTitleAr : data.principleTitleEn}`,
    contentPinLabel: `${data.contentPackId} v${data.contentPackVersion} · ${data.contentHash.slice(0, 8)}…`,
    derivedStatus,
    derivedStatusLabel: derivedStatusLabel(derivedStatus, locale),
    derivedStatusVariant: derivedStatusVariant(derivedStatus),
    requirements,
    wpConformance: data.wpConformance.map((w) =>
      wpConformancePresentation(w, locale),
    ),
    decisionTrail,
    decisionTrailEmptyNote:
      decisionTrail.length === 0
        ? locale === "ar"
          ? "لا توجد إدخالات مسجلة في سجل التدقيق لهذا المعيار بعد."
          : "No audit-log entries recorded for this standard yet."
        : null,
  };
}

function standardFromQuestionnaire(
  standardNumber: string,
  locale: Locale,
): {
  standardTitle: string;
  domainNumber: string;
  domainTitle: string;
  principleNumber: string;
  principleTitle: string;
  questionIds: string[];
  questionText: Map<string, string>;
} | null {
  const catalog = loadBundledCatalog();
  const pack = catalog.get(SEERA_DEMO_PACK_ID, SEERA_DEMO_PACK_VERSION);
  const questionnaire = renderQuestionnaire(pack, locale);
  for (const domain of questionnaire.domains) {
    for (const principle of domain.principles) {
      for (const standard of principle.standards) {
        if (standard.number !== standardNumber) continue;
        return {
          standardTitle: standard.title,
          domainNumber: domain.number,
          domainTitle: domain.title,
          principleNumber: principle.number,
          principleTitle: principle.title,
          questionIds: standard.questions.map((q) => q.questionId),
          questionText: new Map(
            standard.questions.map((q) => [q.questionId, q.text]),
          ),
        };
      }
    }
  }
  return null;
}

export function buildStandardDetailPresentation(
  locale: Locale,
  role: DashboardRole,
  standardNumber: string,
): StandardDetailPresentation | null {
  const meta = standardFromQuestionnaire(standardNumber, locale);
  if (!meta) return null;

  const statuses = createSeeraDemoStatusesByQuestion();
  const responses = createSeeraDemoResponses(locale);
  const drafts = createSeeraDemoDraftFindings(locale);
  const conclusions = createSeeraDemoFinalConclusions();
  const evidence = createSeeraDemoEvidenceMetadata();
  const wpEngagement = createSeeraDemoWorkingPaperEngagement();
  const catalog = loadBundledCatalog();

  const requirements: PresentedStandardRequirement[] = meta.questionIds.map(
    (questionId) => {
      const response = responses.find((r) => r.questionId === questionId);
      const draft = drafts.find((d) => d.questionId === questionId);
      const conclusion = conclusions.find((c) => c.questionId === questionId);
      const linkedEvidence = evidence.filter(
        (ev) =>
          ev.links.includes(standardNumber) || ev.links.includes(questionId),
      );
      const status = statuses.get(questionId) ?? "not_assessed";
      return {
        questionId,
        questionText: meta.questionText.get(questionId) ?? questionId,
        status,
        statusLabel: uxStatusLabel(status, locale),
        answer: response?.answer ?? null,
        note: response?.note ?? null,
        evidence: linkedEvidence.map((ev) => {
          const scan =
            ev.scanStatus === "clean"
              ? "clean"
              : ev.scanStatus === "infected"
                ? "infected"
                : "quarantined";
          const labels = scanLabels(scan);
          return {
            evidenceId: ev.evidenceId,
            fileName: ev.fileName,
            scanStatus: scan,
            scanLabelEn: labels.en,
            scanLabelAr: labels.ar,
            sizeLabelEn: formatBytes(ev.sizeBytes, "en"),
            sizeLabelAr: formatBytes(ev.sizeBytes, "ar"),
          };
        }),
        draftSummary: draft?.draftSummary ?? null,
        finalConclusion: conclusion?.conclusion ?? null,
      };
    },
  );

  const wpConformance: PresentedWpConformanceItem[] = wpEngagement.items
    .filter((item) => item.standardNumber === standardNumber)
    .map((item) => {
      const pin = createSeeraDemoContentPin();
      const contentItems = resolveChecklistItems(
        catalog,
        {
          contentPackId: pin.contentPackId,
          version: pin.version,
          contentHash: pin.contentHash,
        },
        item.standardNumber,
      );
      const contentItem = contentItems.find((i) => i.id === item.itemId);
      const raw = {
        checklistId: item.checklistId,
        itemId: item.itemId,
        itemTextEn: contentItem?.text.en ?? item.itemId,
        itemTextAr: contentItem?.text.ar ?? item.itemId,
        workingPaperRef: item.workingPaperRef,
        workingPaperTitle:
          locale === "ar"
            ? item.workingPaperTitleAr
            : item.workingPaperTitleEn,
        conformance: item.conformance,
        note: item.note,
        recordedBy: item.recordedBy,
        recordedAt: item.recordedAt,
      };
      return wpConformancePresentation(raw, locale);
    });

  const questionStatuses = requirements.map((r) => r.status);
  const derivedStatus = deriveStandardStatus({
    questionStatuses,
    hasOpenDraft: requirements.some((r) => r.draftSummary && !r.finalConclusion),
    wpNonConformant: wpConformance.some((w) => w.conformanceVariant === "gap"),
    wpUnreviewed: wpConformance.some((w) => w.conformanceVariant === "partial"),
  });

  const pin = createSeeraDemoContentPin();

  return {
    assessmentId: SEERA_DEMO_ASSESSMENT_ID,
    assessmentName: createSeeraDemoAssessmentName()[locale],
    locale,
    role,
    roleLabel: ROLE_LABELS[role][locale],
    isSummaryView: role === "board",
    standardNumber,
    standardTitle: meta.standardTitle,
    domainLabel: `${meta.domainNumber} · ${meta.domainTitle}`,
    principleLabel: `${meta.principleNumber} · ${meta.principleTitle}`,
    contentPinLabel: `${pin.contentPackId} v${pin.version} · ${pin.contentHash.slice(0, 8)}…`,
    derivedStatus,
    derivedStatusLabel: derivedStatusLabel(derivedStatus, locale),
    derivedStatusVariant: derivedStatusVariant(derivedStatus),
    requirements,
    wpConformance,
    decisionTrail: [],
    decisionTrailEmptyNote:
      locale === "ar"
        ? "مسار القرار التجريبي — لا توجد إدخالات سجل تدقيق في وضع العرض التجريبي."
        : "Synthetic demo — no audit-log decision trail in fixture mode.",
  };
}

export const DEMO_STANDARD_NUMBERS = [
  SEERA_DEMO_STANDARDS.ETHICS,
  SEERA_DEMO_STANDARDS.OBJECTIVITY,
  SEERA_DEMO_STANDARDS.ORG_INDEPENDENCE,
] as const;
