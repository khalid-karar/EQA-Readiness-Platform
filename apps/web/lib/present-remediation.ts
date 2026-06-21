import type { Locale } from "@eqa/content";
import type { RemediationWorkspaceLoadResult } from "@eqa/db";
import {
  createSeeraDemoEvidenceMetadata,
  createSeeraDemoRemediationItems,
  createSyntheticRemediationView,
  SEERA_DEMO_ASSESSMENT_ID,
  ROLE_LABELS,
  uxStatusLabel,
  type DashboardRole,
  type EvidenceMetadataForPack,
  type ItemStatus,
  type RemediationPendingAction,
} from "@eqa/workflows";
import { remediationScheduleLabel } from "./remediation-display";

export interface PresentedLinkedEvidence {
  readonly evidenceId: string;
  readonly version: number;
  readonly fileName: string;
  readonly scanStatus: string;
  readonly scanLabel: string;
  readonly uploadedAt: string;
}

export interface PresentedRemediationRow {
  readonly id: string;
  readonly remediationId: string;
  readonly questionId: string;
  readonly standardNumber: string;
  readonly standardTitle: string;
  readonly action: string;
  readonly owner: string;
  readonly targetDate: string;
  readonly itemStatus: ItemStatus;
  readonly statusLabel: string;
  readonly isOverdue: boolean;
  readonly daysOverdue: number;
  readonly scheduleLabelEn: string;
  readonly scheduleLabelAr: string;
  readonly retestNote: string | null;
  readonly closedAt: string | null;
  readonly hadRetestFailure: boolean;
  readonly linkedEvidence: readonly PresentedLinkedEvidence[];
}

export interface RemediationPresentation {
  readonly assessmentId: string;
  readonly assessmentName: string;
  readonly locale: Locale;
  readonly role: DashboardRole;
  readonly roleLabel: string;
  readonly isSummaryView: boolean;
  readonly canOperate: boolean;
  readonly openCount: number;
  readonly overdueCount: number;
  readonly pendingActions: readonly RemediationPendingAction[];
  readonly rows: readonly PresentedRemediationRow[];
  readonly statusLabels: Readonly<Record<ItemStatus, string>>;
}

const ALL_STATUSES: readonly ItemStatus[] = [
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
];

function isClosedStatus(status: ItemStatus): boolean {
  return status === "closed_ready" || status === "not_applicable";
}

function scanLabel(scanStatus: string, locale: Locale): string {
  if (scanStatus === "clean") {
    return locale === "ar" ? "نظيف" : "Clean";
  }
  if (scanStatus === "quarantined") {
    return locale === "ar" ? "في الحجر" : "Quarantined";
  }
  return scanStatus;
}

function evidenceForQuestion(
  questionId: string,
  items: readonly EvidenceMetadataForPack[],
  locale: Locale,
): PresentedLinkedEvidence[] {
  return items
    .filter((item) => item.links.includes(questionId))
    .map((item) => ({
      evidenceId: item.evidenceId,
      version: item.version,
      fileName: item.fileName,
      scanStatus: item.scanStatus,
      scanLabel: scanLabel(item.scanStatus, locale),
      uploadedAt: item.uploadedAt,
    }));
}

function buildRows(
  view: import("@eqa/workflows").RemediationTrackerView,
  itemsById: ReadonlyMap<string, import("@eqa/workflows").RemediationItem>,
  evidenceItems: readonly EvidenceMetadataForPack[],
): PresentedRemediationRow[] {
  const locale = view.locale;

  return view.items.map((row) => {
    const item = itemsById.get(row.remediationId);
    const closed = isClosedStatus(row.itemStatus);
    return {
      id: row.remediationId,
      remediationId: row.remediationId,
      questionId: row.questionId,
      standardNumber: row.standardNumber,
      standardTitle: row.standardTitle,
      action: row.action,
      owner: row.owner,
      targetDate: row.targetDate,
      itemStatus: row.itemStatus,
      statusLabel: row.statusLabel,
      isOverdue: row.isOverdue,
      daysOverdue: row.daysOverdue,
      scheduleLabelEn: remediationScheduleLabel(
        "en",
        row.isOverdue,
        closed,
        row.daysOverdue,
      ),
      scheduleLabelAr: remediationScheduleLabel(
        "ar",
        row.isOverdue,
        closed,
        row.daysOverdue,
      ),
      retestNote: item?.retestNote ?? null,
      closedAt: item?.closedAt ?? null,
      hadRetestFailure: item?.retestNote != null,
      linkedEvidence: evidenceForQuestion(
        row.questionId,
        evidenceItems,
        locale,
      ),
    };
  });
}

export function buildRemediationPresentationFromWorkspace(
  load: RemediationWorkspaceLoadResult,
): RemediationPresentation {
  const { view, items, evidenceItems } = load;
  const locale = view.locale;
  const role = view.role;
  const itemsById = new Map(items.map((item) => [item.remediationId, item]));

  const statusLabels = Object.fromEntries(
    ALL_STATUSES.map((status) => [status, uxStatusLabel(status, locale)]),
  ) as Record<ItemStatus, string>;

  return {
    assessmentId: view.assessmentId,
    assessmentName: view.assessmentName,
    locale: view.locale,
    role: view.role,
    roleLabel: ROLE_LABELS[role][locale],
    isSummaryView: view.isSummaryView,
    canOperate: !view.isSummaryView,
    openCount: view.openCount,
    overdueCount: view.overdueCount,
    pendingActions: view.pendingActions,
    rows: buildRows(view, itemsById, evidenceItems),
    statusLabels,
  };
}

export function buildRemediationPresentationFromView(
  view: import("@eqa/workflows").RemediationTrackerView,
  itemsById?: ReadonlyMap<string, import("@eqa/workflows").RemediationItem>,
  evidenceItems: readonly EvidenceMetadataForPack[] = [],
): RemediationPresentation {
  const locale = view.locale;
  const role = view.role;

  const statusLabels = Object.fromEntries(
    ALL_STATUSES.map((status) => [status, uxStatusLabel(status, locale)]),
  ) as Record<ItemStatus, string>;

  return {
    assessmentId: view.assessmentId,
    assessmentName: view.assessmentName,
    locale: view.locale,
    role: view.role,
    roleLabel: ROLE_LABELS[role][locale],
    isSummaryView: view.isSummaryView,
    canOperate: !view.isSummaryView,
    openCount: view.openCount,
    overdueCount: view.overdueCount,
    pendingActions: view.pendingActions,
    rows: buildRows(view, itemsById ?? new Map(), evidenceItems),
    statusLabels,
  };
}

export function buildRemediationPresentation(
  locale: Locale,
  role: DashboardRole,
): RemediationPresentation {
  const view = createSyntheticRemediationView(locale, role);
  const itemsById = new Map(
    createSeeraDemoRemediationItems(locale).map((item) => [
      item.remediationId,
      item,
    ]),
  );

  const statusLabels = Object.fromEntries(
    ALL_STATUSES.map((status) => [status, uxStatusLabel(status, locale)]),
  ) as Record<ItemStatus, string>;

  return {
    assessmentId: SEERA_DEMO_ASSESSMENT_ID,
    assessmentName: view.assessmentName,
    locale: view.locale,
    role: view.role,
    roleLabel: ROLE_LABELS[role][locale],
    isSummaryView: view.isSummaryView,
    canOperate: !view.isSummaryView,
    openCount: view.openCount,
    overdueCount: view.overdueCount,
    pendingActions: view.pendingActions,
    rows: buildRows(view, itemsById, createSeeraDemoEvidenceMetadata()),
    statusLabels,
  };
}
