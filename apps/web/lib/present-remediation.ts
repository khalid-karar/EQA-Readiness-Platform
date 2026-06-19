import {
  createSyntheticRemediationView,
  ROLE_LABELS,
  uxStatusLabel,
  type ItemStatus,
  type RemediationTrackerView,
} from "@eqa/workflows";
import type { Locale } from "@eqa/content";
import { parseLocale, parseRole } from "./dashboard-params";

export interface RemediationPresentation {
  readonly view: RemediationTrackerView;
  readonly roleLabel: string;
  readonly statusLabels: Readonly<Record<ItemStatus, string>>;
}

export function buildRemediationPresentation(
  locale: Locale,
  role: ReturnType<typeof parseRole>,
): RemediationPresentation {
  const view = createSyntheticRemediationView(locale, role);
  const statusLabels = Object.fromEntries(
    (
      [
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
      ] as const
    ).map((status) => [status, uxStatusLabel(status, locale)]),
  ) as Record<ItemStatus, string>;

  return {
    view,
    roleLabel: ROLE_LABELS[role][locale],
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
