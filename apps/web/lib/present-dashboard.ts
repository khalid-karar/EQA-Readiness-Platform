import type { Locale } from "@eqa/content";
import {
  buildDashboardView,
  createSyntheticDashboardInput,
  ROLE_LABELS,
  uxStatusLabel,
  type DashboardRole,
  type DashboardView,
  type HeatMapCell,
  type ItemStatus,
} from "@eqa/workflows";
import { uiLabel } from "./ui-labels";

export interface PresentedHeatMapCell {
  readonly standardNumber: string;
  readonly standardTitle: string;
  readonly domainNumber: string;
  readonly domainTitle: string;
  readonly principleNumber: string;
  readonly principleTitle: string;
  readonly readinessScore: number;
  readonly readinessLevel: HeatMapCell["readinessLevel"];
  readonly statusLabel: string;
  readonly tooltipLines: readonly string[];
}

export interface DashboardPresentation {
  readonly view: DashboardView;
  readonly roleLabel: string;
  readonly heatMapCells: readonly PresentedHeatMapCell[];
  readonly cellPresentation: Readonly<Record<string, PresentedHeatMapCell>>;
  readonly statusLabels: Readonly<Record<ItemStatus, string>>;
}

export function buildDashboardPresentation(
  locale: Locale,
  role: DashboardRole,
): DashboardPresentation {
  const input = createSyntheticDashboardInput(locale, role);
  const view = buildDashboardView(input);
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

  const heatMapCells = view.heatMap.flatMap((domain) =>
    domain.principles.flatMap((principle) =>
      principle.standards.map((cell) => presentHeatMapCell(cell, locale, view)),
    ),
  );

  return {
    view,
    roleLabel: ROLE_LABELS[role][locale],
    heatMapCells,
    cellPresentation: Object.fromEntries(
      heatMapCells.map((cell) => [cell.standardNumber, cell]),
    ),
    statusLabels,
  };
}

function presentHeatMapCell(
  cell: HeatMapCell,
  locale: Locale,
  view: DashboardView,
): PresentedHeatMapCell {
  const tooltipLines: string[] = [
    `${uiLabel("readiness", locale)}: ${cell.readinessScore}%`,
  ];

  if (cell.conformance) {
    tooltipLines.push(
      `${uiLabel("wpReview", locale)}: ` +
        `${cell.conformance.conforms} ${uiLabel("conforms", locale).toLowerCase()}, ` +
        `${cell.conformance.doesNotConform} ${uiLabel("gaps", locale).toLowerCase()}, ` +
        `${cell.conformance.unreviewed} ${uiLabel("unreviewed", locale).toLowerCase()}`,
    );
  }

  if (!view.isSummaryView && cell.statusBreakdown) {
    for (const [status, count] of Object.entries(cell.statusBreakdown)) {
      if (count && count > 0) {
        tooltipLines.push(
          `${uxStatusLabel(status as ItemStatus, locale)}: ${count}`,
        );
      }
    }
  }

  return {
    standardNumber: cell.standardNumber,
    standardTitle: cell.standardTitle,
    domainNumber: cell.domainNumber,
    domainTitle: cell.domainTitle,
    principleNumber: cell.principleNumber,
    principleTitle: cell.principleTitle,
    readinessScore: cell.readinessScore,
    readinessLevel: cell.readinessLevel,
    statusLabel: uxStatusLabel(cell.dominantStatus, locale),
    tooltipLines,
  };
}
