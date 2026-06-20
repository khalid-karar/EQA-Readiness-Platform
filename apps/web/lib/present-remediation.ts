import type { Locale } from "@eqa/content";
import {
  createSeeraDemoRemediationItems,
  createSyntheticRemediationView,
  ROLE_LABELS,
  uxStatusLabel,
  type DashboardRole,
  type ItemStatus,
  type RemediationPendingAction,
} from "@eqa/workflows";
import { parseLocale, parseRole } from "./dashboard-params";
import { remediationTrackLabel } from "./remediation-display";

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
}

export interface RemediationPresentation {
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

export function buildRemediationPresentation(
  locale: Locale,
  role: ReturnType<typeof parseRole>,
): RemediationPresentation {
  const view = createSyntheticRemediationView(locale, role);
  const itemsById = new Map(
    createSeeraDemoRemediationItems(locale).map((item) => [
      item.remediationId,
      item,
    ]),
  );

  const rows: PresentedRemediationRow[] = view.items.map((row) => {
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
      scheduleLabelEn: remediationTrackLabel("en", row.isOverdue, closed),
      scheduleLabelAr: remediationTrackLabel("ar", row.isOverdue, closed),
      retestNote: item?.retestNote ?? null,
      closedAt: item?.closedAt ?? null,
      hadRetestFailure: item?.retestNote != null,
    };
  });

  const statusLabels = Object.fromEntries(
    ALL_STATUSES.map((status) => [status, uxStatusLabel(status, locale)]),
  ) as Record<ItemStatus, string>;

  return {
    assessmentName: view.assessmentName,
    locale: view.locale,
    role: view.role,
    roleLabel: ROLE_LABELS[role][locale],
    isSummaryView: view.isSummaryView,
    canOperate: !view.isSummaryView,
    openCount: view.openCount,
    overdueCount: view.overdueCount,
    pendingActions: view.pendingActions,
    rows,
    statusLabels,
  };
}

export function parseRemediationParams(
  params: Record<string, string | string[] | undefined>,
): { locale: Locale; role: ReturnType<typeof parseRole> } {
  return {
    locale: parseLocale(
      typeof params.locale === "string" ? params.locale : undefined,
    ),
    role: parseRole(typeof params.role === "string" ? params.role : undefined),
  };
}
