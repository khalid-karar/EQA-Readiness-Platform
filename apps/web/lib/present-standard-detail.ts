import type { StandardDetailLoadResult, AuditEntry } from "@eqa/db";
import type { Locale } from "@eqa/content";
import { loadBundledCatalog, resolveChecklistItems } from "@eqa/content";
import {
  createSeeraDemoAssessmentName,
  createSeeraDemoContentPin,
  createSeeraDemoDraftFindings,
  createSeeraDemoEvidenceMetadata,
  createSeeraDemoFinalConclusions,
  createSeeraDemoResponses,
  createSeeraDemoStatusesByQuestion,
  createSeeraDemoWorkingPaperEngagement,
  SEERA_DEMO_ASSESSMENT_ID,
  SEERA_DEMO_PACK_ID,
  SEERA_DEMO_PACK_VERSION,
  SEERA_DEMO_STANDARDS,
} from "@eqa/workflows/synthetic-seera-demo";
import { renderQuestionnaire } from "@eqa/workflows/render";
import {
  ROLE_LABELS,
  uxStatusLabel,
  type DashboardRole,
} from "@eqa/workflows/readiness-dashboard";
import {
  computeDerivedStandardPresentation,
  type PresentedDecisionTrailEntry,
  type PresentedStandardRequirement,
  type PresentedWpConformanceItem,
  type StandardDetailPresentation,
} from "./standard-detail-shared";

export type {
  DerivedStandardStatus,
  PresentedDecisionTrailEntry,
  PresentedStandardEvidence,
  PresentedStandardRequirement,
  PresentedWpConformanceItem,
  StandardDetailPresentation,
} from "./standard-detail-shared";
export { computeDerivedStandardPresentation, deriveStandardStatus } from "./standard-detail-shared";

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
    checklistId: raw.checklistId,
    itemId: raw.itemId,
    itemText: locale === "ar" ? raw.itemTextAr : raw.itemTextEn,
    workingPaperRef: raw.workingPaperRef,
    workingPaperTitle: raw.workingPaperTitle,
    conformanceLabel,
    conformanceVariant: variant,
    conformanceRaw: raw.conformance,
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
  const isSummaryView = role === "board";
  const canOperate = !isSummaryView;
  const canReview = canOperate;
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
      findingId: req.draftFinding?.findingId ?? null,
      finalConclusion: req.finalConclusion?.conclusion ?? null,
      rubric: locale === "ar" ? req.rubricAr : req.rubricEn,
      pinPackId: req.pinContentPackId,
      pinVersion: req.pinVersion,
      pinHash: req.pinHash,
      remediationId: req.remediationId,
      remediationAction: req.remediationAction,
      remediationOwner: req.remediationOwner,
      remediationTargetDate: req.remediationTargetDate,
    }),
  );

  const wpConformance = data.wpConformance.map((w) =>
    wpConformancePresentation(w, locale),
  );

  const derived = computeDerivedStandardPresentation(
    requirements,
    wpConformance,
    locale,
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
    isSummaryView,
    canOperate,
    canReview,
    standardNumber: data.standardNumber,
    standardTitle:
      locale === "ar" ? data.standardTitleAr : data.standardTitleEn,
    domainLabel: `${data.domainNumber} · ${locale === "ar" ? data.domainTitleAr : data.domainTitleEn}`,
    principleLabel: `${data.principleNumber} · ${locale === "ar" ? data.principleTitleAr : data.principleTitleEn}`,
    contentPinLabel: `${data.contentPackId} v${data.contentPackVersion} · ${data.contentHash.slice(0, 8)}…`,
    ...derived,
    requirements,
    wpConformance,
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
  rubric: { level: number; label: string; descriptor: string }[];
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
          rubric: standard.rubric.map((r) => ({
            level: r.level,
            label: r.label,
            descriptor: r.descriptor,
          })),
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
  const pin = createSeeraDemoContentPin();
  const isSummaryView = role === "board";

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
        findingId: draft?.findingId ?? null,
        finalConclusion: conclusion?.conclusion ?? null,
        rubric: meta.rubric,
        pinPackId: pin.contentPackId,
        pinVersion: pin.version,
        pinHash: pin.contentHash,
        remediationId:
          status === "gap_confirmed" || status === "remediation_in_progress"
            ? `demo-rem-${questionId}`
            : null,
        remediationAction:
          status === "gap_confirmed" || status === "remediation_in_progress"
            ? "Demo remediation action"
            : null,
        remediationOwner:
          status === "remediation_in_progress" ? "audit-staff" : null,
        remediationTargetDate:
          status === "gap_confirmed" || status === "remediation_in_progress"
            ? "2026-12-31"
            : null,
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

  const derived = computeDerivedStandardPresentation(
    requirements,
    wpConformance,
    locale,
  );

  return {
    assessmentId: SEERA_DEMO_ASSESSMENT_ID,
    assessmentName: createSeeraDemoAssessmentName()[locale],
    locale,
    role,
    roleLabel: ROLE_LABELS[role][locale],
    isSummaryView,
    canOperate: !isSummaryView,
    canReview: !isSummaryView,
    standardNumber,
    standardTitle: meta.standardTitle,
    domainLabel: `${meta.domainNumber} · ${meta.domainTitle}`,
    principleLabel: `${meta.principleNumber} · ${meta.principleTitle}`,
    contentPinLabel: `${pin.contentPackId} v${pin.version} · ${pin.contentHash.slice(0, 8)}…`,
    ...derived,
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
