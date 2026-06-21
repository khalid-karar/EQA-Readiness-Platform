import type { Locale } from "@eqa/content";
import {
  buildDashboardView,
  computeOverallReadiness,
  createSyntheticDashboardInput,
  ROLE_LABELS,
  uxStatusLabel,
  type DashboardInput,
  type DashboardRole,
  type DashboardView,
  type HeatMapCell,
  type ItemStatus,
  type ReadinessLevel,
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

export interface PresentedDomainRollup {
  readonly domainId: string;
  readonly domainNumber: string;
  readonly domainTitle: string;
  readonly readinessScore: number;
  readonly readinessLevel: ReadinessLevel;
  readonly standardCount: number;
}

export interface DashboardPresentation {
  readonly view: DashboardView;
  readonly roleLabel: string;
  readonly heatMapCells: readonly PresentedHeatMapCell[];
  readonly cellPresentation: Readonly<Record<string, PresentedHeatMapCell>>;
  readonly domainRollups: Readonly<Record<string, PresentedDomainRollup>>;
  readonly statusLabels: Readonly<Record<ItemStatus, string>>;
}

export function buildDashboardPresentationFromInput(
  input: DashboardInput,
): DashboardPresentation {
  const view = buildDashboardView(input);
  const locale = input.locale;
  const role = input.role;
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

  const domainRollups = Object.fromEntries(
    view.heatMap.map((domain) => {
      const standards = domain.principles.flatMap((principle) =>
        principle.standards.map((cell) => cell),
      );
      const rollup = computeOverallReadiness(standards, locale);
      return [
        domain.id,
        {
          domainId: domain.id,
          domainNumber: domain.number,
          domainTitle: domain.title,
          readinessScore: rollup.score,
          readinessLevel: rollup.level,
          standardCount: standards.length,
        } satisfies PresentedDomainRollup,
      ];
    }),
  );

  return {
    view,
    roleLabel: ROLE_LABELS[role][locale],
    heatMapCells,
    cellPresentation: Object.fromEntries(
      heatMapCells.map((cell) => [cell.standardNumber, cell]),
    ),
    domainRollups,
    statusLabels,
  };
}

export function buildDashboardPresentation(
  locale: Locale,
  role: DashboardRole,
): DashboardPresentation {
  return buildDashboardPresentationFromInput(
    createSyntheticDashboardInput(locale, role),
  );
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
