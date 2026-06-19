import type { Locale } from "@eqa/content";
import {
  buildMockEqaSimulationView,
  computeMockEqaSimulation,
  createSyntheticMockEqaInput,
  MOCK_EQA_DISCLAIMER,
  ROLE_LABELS,
  type DashboardRole,
  type MockEqaSimulationView,
} from "@eqa/workflows";
import { uiLabel } from "./ui-labels";

export interface PresentedDrivingGap {
  readonly id: string;
  readonly standardNumber: string;
  readonly questionId?: string;
  readonly source: string;
  readonly summary: string;
}

export interface PresentedStandardRating {
  readonly standardNumber: string;
  readonly standardTitle: string;
  readonly principleNumber: string;
  readonly ratingScore: number;
  readonly ratingLevel: "green" | "amber" | "red";
  readonly ratingLabel: string;
  readonly drivingGaps: readonly PresentedDrivingGap[];
}

export interface PresentedDomainRating {
  readonly domainNumber: string;
  readonly domainTitle: string;
  readonly ratingScore: number;
  readonly ratingLevel: "green" | "amber" | "red";
  readonly ratingLabel: string;
  readonly standards: readonly PresentedStandardRating[];
}

export interface MockEqaPresentation {
  readonly view: MockEqaSimulationView;
  readonly roleLabel: string;
  readonly disclaimerText: string;
  readonly disclaimerShort: string;
  readonly domains: readonly PresentedDomainRating[];
  readonly overallScore: number;
  readonly overallLevel: "green" | "amber" | "red";
  readonly overallLabel: string;
}

export function buildMockEqaPresentation(
  locale: Locale,
  role: DashboardRole,
): MockEqaPresentation {
  const input = createSyntheticMockEqaInput(locale, role);
  const simulation = computeMockEqaSimulation(input);
  const view = buildMockEqaSimulationView({ ...input, role, simulation });

  const domains: PresentedDomainRating[] = simulation.domains.map((domain) => ({
    domainNumber: domain.domainNumber,
    domainTitle: domain.domainTitle,
    ratingScore: domain.rating.score,
    ratingLevel: domain.rating.level,
    ratingLabel: domain.rating.label,
    standards: domain.standards.map((std) => ({
      standardNumber: std.standardNumber,
      standardTitle: std.standardTitle,
      principleNumber: std.principleNumber,
      ratingScore: std.rating.score,
      ratingLevel: std.rating.level,
      ratingLabel: std.rating.label,
      drivingGaps: std.drivingGaps.map((gap) => ({
        id: gap.id,
        standardNumber: gap.standardNumber,
        source: gap.source,
        summary: gap.summary,
        ...(gap.questionId === undefined
          ? {}
          : { questionId: gap.questionId }),
      })),
    })),
  }));

  return {
    view,
    roleLabel: ROLE_LABELS[role][locale],
    disclaimerText: MOCK_EQA_DISCLAIMER[locale],
    disclaimerShort:
      locale === "ar"
        ? MOCK_EQA_DISCLAIMER.shortAr
        : MOCK_EQA_DISCLAIMER.shortEn,
    domains,
    overallScore: simulation.overall.score,
    overallLevel: simulation.overall.level,
    overallLabel: simulation.overall.label,
  };
}

export function mockEqaOutputIncludesDisclaimer(
  presentation: MockEqaPresentation,
): boolean {
  const text = presentation.disclaimerText.toLowerCase();
  return (
    text.includes("simulation") ||
    text.includes("محاكاة") ||
    text.includes("does not replace") ||
    text.includes("لا تحل محل")
  );
}
