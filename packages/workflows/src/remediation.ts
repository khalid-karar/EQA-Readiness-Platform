import type { Locale } from "@eqa/content";
import { localize } from "@eqa/content";
import { InvalidRemediationInputError } from "./errors";
import {
  isSummaryView,
  uxStatusLabel,
  type DashboardRole,
} from "./readiness-dashboard";
import {
  daysOverdue,
  isRemediationClosed,
  isRemediationOverdue,
} from "./remediation-pure";
import type { ItemStatus } from "./state-machine";
import { INITIAL_ITEM_STATUS } from "./state-machine";

export {
  daysOverdue,
  isRemediationClosed,
  isRemediationOverdue,
  resolveAssignRemediation,
  resolveReadyForRetest,
  resolveRetestFail,
  resolveRetestPass,
  type RemediationTransition,
} from "./remediation-pure";

/** A tracked remediation plan for one confirmed gap (one assessment item). */
export interface RemediationItem {
  readonly remediationId: string;
  readonly assessmentId: string;
  readonly questionId: string;
  readonly standardNumber: string;
  readonly action: string;
  readonly owner: string;
  /** ISO calendar date (YYYY-MM-DD). */
  readonly targetDate: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedBy: string;
  readonly updatedAt: string;
  readonly closedAt: string | null;
  readonly retestNote: string | null;
}

export interface AssignRemediationInput {
  readonly assessmentId: string;
  readonly questionId: string;
  readonly standardNumber: string;
  readonly action: string;
  readonly owner: string;
  readonly targetDate: string;
}

export interface UpdateRemediationInput {
  readonly remediationId: string;
  readonly action?: string;
  readonly owner?: string;
  readonly targetDate?: string;
}

export interface RemediationTrackerRow {
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
}

export interface RemediationTrackerView {
  readonly assessmentId: string;
  readonly assessmentName: string;
  readonly locale: Locale;
  readonly role: DashboardRole;
  readonly isSummaryView: boolean;
  readonly openCount: number;
  readonly overdueCount: number;
  readonly items: readonly RemediationTrackerRow[];
  readonly pendingActions: readonly RemediationPendingAction[];
}

export interface RemediationPendingAction {
  readonly id: string;
  readonly count: number;
  readonly label: string;
  readonly priority: "high" | "medium" | "low";
}

/**
 * Persistence port for the remediation tracker. Implemented by
 * {@link TenantRemediationRepository} in @eqa/db.
 */
export interface RemediationStore {
  assign(input: AssignRemediationInput): Promise<RemediationItem>;
  updatePlan(input: UpdateRemediationInput): Promise<RemediationItem>;
  markReadyForRetest(remediationId: string): Promise<RemediationItem>;
  recordRetestPass(remediationId: string): Promise<RemediationItem>;
  recordRetestFail(
    remediationId: string,
    note?: string,
  ): Promise<RemediationItem>;
  getById(remediationId: string): Promise<RemediationItem | null>;
  listForAssessment(assessmentId: string): Promise<RemediationItem[]>;
}

function assertNonEmpty(value: string, field: string): void {
  if (!value.trim()) {
    throw new InvalidRemediationInputError(`${field} is required.`);
  }
}

function assertDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new InvalidRemediationInputError(
      `targetDate must be an ISO calendar date (YYYY-MM-DD), got '${value}'.`,
    );
  }
}

export interface BuildRemediationTrackerInput {
  readonly assessmentId: string;
  readonly assessmentName: { en: string; ar: string };
  readonly locale: Locale;
  readonly role: DashboardRole;
  readonly items: readonly RemediationItem[];
  readonly statusesByQuestion: ReadonlyMap<string, ItemStatus>;
  readonly standardTitles: ReadonlyMap<string, string>;
  readonly referenceDate?: string;
}

/** Open remediation plans past target date — shared by tracker and cockpit queue. */
export function countRemediationOverdue(
  items: readonly RemediationItem[],
  statusesByQuestion: ReadonlyMap<string, ItemStatus>,
  referenceDate?: string,
): number {
  const ref = referenceDate ?? new Date().toISOString();
  return items.filter((item) => {
    const itemStatus =
      statusesByQuestion.get(item.questionId) ?? INITIAL_ITEM_STATUS;
    return (
      !isRemediationClosed(itemStatus) &&
      isRemediationOverdue(item.targetDate, itemStatus, ref)
    );
  }).length;
}

/** Assembles the remediation tracker view for presentation (UI layer). */
export function buildRemediationTrackerView(
  input: BuildRemediationTrackerInput,
): RemediationTrackerView {
  const referenceDate = input.referenceDate ?? new Date().toISOString();
  const summary = isSummaryView(input.role);

  const rows: RemediationTrackerRow[] = input.items.map((item) => {
    const itemStatus =
      input.statusesByQuestion.get(item.questionId) ?? INITIAL_ITEM_STATUS;
    const overdue = isRemediationOverdue(
      item.targetDate,
      itemStatus,
      referenceDate,
    );
    return {
      remediationId: item.remediationId,
      questionId: item.questionId,
      standardNumber: item.standardNumber,
      standardTitle:
        input.standardTitles.get(item.standardNumber) ?? item.standardNumber,
      action: item.action,
      owner: item.owner,
      targetDate: item.targetDate,
      itemStatus,
      statusLabel: uxStatusLabel(itemStatus, input.locale),
      isOverdue: overdue,
      daysOverdue: daysOverdue(item.targetDate, itemStatus, referenceDate),
    };
  });

  const openRows = rows.filter((r) => !isRemediationClosed(r.itemStatus));
  const overdueRows = openRows.filter((r) => r.isOverdue);

  const pendingActions: RemediationPendingAction[] = [];
  if (overdueRows.length > 0) {
    pendingActions.push({
      id: "overdue",
      count: overdueRows.length,
      label: summary
        ? localize(
            {
              en: `${overdueRows.length} remediation item(s) past target date`,
              ar: `${overdueRows.length} بند(اً) معالجة تجاوز تاريخه المستهدف`,
            },
            input.locale,
          )
        : localize(
            {
              en: `${overdueRows.length} item(s) overdue — follow up with owners`,
              ar: `${overdueRows.length} بند(اً) متأخر(اً) — تابع مع المسؤولين`,
            },
            input.locale,
          ),
      priority: "high",
    });
  }

  const awaitingRetest = rows.filter(
    (r) => r.itemStatus === "ready_for_retest",
  ).length;
  if (awaitingRetest > 0) {
    pendingActions.push({
      id: "awaiting-retest",
      count: awaitingRetest,
      label: localize(
        {
          en: `${awaitingRetest} item(s) ready for re-test`,
          ar: `${awaitingRetest} بند(اً) جاهز(اً) لإعادة الاختبار`,
        },
        input.locale,
      ),
      priority: "medium",
    });
  }

  const inProgress = rows.filter(
    (r) => r.itemStatus === "remediation_in_progress",
  ).length;
  if (inProgress > 0 && !summary) {
    pendingActions.push({
      id: "in-progress",
      count: inProgress,
      label: localize(
        {
          en: `${inProgress} remediation(s) in progress`,
          ar: `${inProgress} معالجة قيد التنفيذ`,
        },
        input.locale,
      ),
      priority: "medium",
    });
  }

  const gapConfirmed = rows.filter(
    (r) => r.itemStatus === "gap_confirmed",
  ).length;
  if (gapConfirmed > 0 && !summary) {
    pendingActions.push({
      id: "needs-assignment",
      count: gapConfirmed,
      label: localize(
        {
          en: `${gapConfirmed} confirmed gap(s) need remediation assignment`,
          ar: `${gapConfirmed} فجوة(ات) مؤكدة تحتاج تعيين معالجة`,
        },
        input.locale,
      ),
      priority: "high",
    });
  }

  return {
    assessmentId: input.assessmentId,
    assessmentName: localize(input.assessmentName, input.locale),
    locale: input.locale,
    role: input.role,
    isSummaryView: summary,
    openCount: openRows.length,
    overdueCount: overdueRows.length,
    items: rows,
    pendingActions,
  };
}

/**
 * Remediation tracker workflow. CAE and Audit Staff assign and advance
 * remediation plans; Board is read-only. Status transitions are enforced by
 * the injected store via the Step 8 state machine.
 */
export class RemediationEngine {
  constructor(private readonly store: RemediationStore) {}

  assign(input: AssignRemediationInput): Promise<RemediationItem> {
    assertNonEmpty(input.action, "action");
    assertNonEmpty(input.owner, "owner");
    assertDate(input.targetDate);
    return this.store.assign(input);
  }

  updatePlan(input: UpdateRemediationInput): Promise<RemediationItem> {
    if (input.action !== undefined) assertNonEmpty(input.action, "action");
    if (input.owner !== undefined) assertNonEmpty(input.owner, "owner");
    if (input.targetDate !== undefined) assertDate(input.targetDate);
    return this.store.updatePlan(input);
  }

  markReadyForRetest(remediationId: string): Promise<RemediationItem> {
    return this.store.markReadyForRetest(remediationId);
  }

  recordRetestPass(remediationId: string): Promise<RemediationItem> {
    return this.store.recordRetestPass(remediationId);
  }

  recordRetestFail(
    remediationId: string,
    note?: string,
  ): Promise<RemediationItem> {
    return this.store.recordRetestFail(remediationId, note);
  }

  listForAssessment(assessmentId: string): Promise<RemediationItem[]> {
    return this.store.listForAssessment(assessmentId);
  }
}
