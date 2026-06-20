import { IllegalRemediationStateError } from "./errors";
import type { ItemStatus } from "./state-machine";

/** Client-safe pure remediation transitions and overdue math (no @eqa/content). */

export interface RemediationTransition {
  readonly from: ItemStatus;
  readonly to: ItemStatus;
}

const CLOSED_STATUSES: ReadonlySet<ItemStatus> = new Set([
  "closed_ready",
  "not_applicable",
]);

export function resolveAssignRemediation(
  currentStatus: ItemStatus,
): RemediationTransition {
  if (currentStatus !== "gap_confirmed") {
    throw new IllegalRemediationStateError(
      `Remediation can only be assigned when the item is 'gap_confirmed'; ` +
        `got '${currentStatus}'.`,
    );
  }
  return { from: currentStatus, to: "remediation_in_progress" };
}

export function resolveReadyForRetest(
  currentStatus: ItemStatus,
): RemediationTransition {
  if (currentStatus !== "remediation_in_progress") {
    throw new IllegalRemediationStateError(
      `Ready-for-retest requires 'remediation_in_progress'; got '${currentStatus}'.`,
    );
  }
  return { from: currentStatus, to: "ready_for_retest" };
}

export function resolveRetestPass(
  currentStatus: ItemStatus,
): RemediationTransition {
  if (currentStatus !== "ready_for_retest") {
    throw new IllegalRemediationStateError(
      `Retest pass requires 'ready_for_retest'; got '${currentStatus}'.`,
    );
  }
  return { from: currentStatus, to: "closed_ready" };
}

export function resolveRetestFail(
  currentStatus: ItemStatus,
): RemediationTransition {
  if (currentStatus !== "ready_for_retest") {
    throw new IllegalRemediationStateError(
      `Retest fail requires 'ready_for_retest'; got '${currentStatus}'.`,
    );
  }
  return { from: currentStatus, to: "under_human_review" };
}

export function isRemediationOverdue(
  targetDate: string,
  itemStatus: ItemStatus,
  referenceDate: string,
): boolean {
  if (CLOSED_STATUSES.has(itemStatus)) return false;
  return targetDate < referenceDate.slice(0, 10);
}

export function daysOverdue(
  targetDate: string,
  itemStatus: ItemStatus,
  referenceDate: string,
): number {
  if (!isRemediationOverdue(targetDate, itemStatus, referenceDate)) return 0;
  const target = new Date(`${targetDate}T00:00:00.000Z`);
  const ref = new Date(`${referenceDate.slice(0, 10)}T00:00:00.000Z`);
  const diff = ref.getTime() - target.getTime();
  return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)));
}

export function isRemediationClosed(itemStatus: ItemStatus): boolean {
  return CLOSED_STATUSES.has(itemStatus);
}
