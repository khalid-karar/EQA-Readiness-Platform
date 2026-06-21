import type { ItemStatus, ReadinessLevel } from "@eqa/workflows";
import { uiLabel } from "./ui-labels";

export interface PresentedStandardNode {
  readonly standardNumber: string;
  readonly standardTitle: string;
  readonly readinessLevel: ReadinessLevel;
  readonly dominantStatus: ItemStatus;
  readonly statusLabel: string;
  readonly answeredCount: number;
  readonly questionCount: number;
  readonly hasGap: boolean;
  readonly isUnanswered: boolean;
  readonly assignedToMe: boolean;
  readonly ownerLabel: string | null;
  readonly detailHref: string;
}

export interface PresentedPrincipleNode {
  readonly id: string;
  readonly number: string;
  readonly title: string;
  readonly standards: readonly PresentedStandardNode[];
}

export interface PresentedDomainNode {
  readonly id: string;
  readonly number: string;
  readonly title: string;
  readonly principles: readonly PresentedPrincipleNode[];
}

export interface StandardsWorkspaceFilters {
  readonly gapsOnly: boolean;
  readonly assignedToMe: boolean;
  readonly unanswered: boolean;
}

export interface StandardsWorkspacePresentation {
  readonly locale: "en" | "ar";
  readonly role: "cae" | "audit_staff" | "board";
  readonly roleLabel: string;
  readonly userId: string;
  readonly assessmentName: string;
  readonly supportsStandardAssignment: false;
  readonly domains: readonly PresentedDomainNode[];
  readonly totalStandards: number;
}

export function filterStandardsWorkspaceTree(
  domains: readonly PresentedDomainNode[],
  filters: StandardsWorkspaceFilters,
): PresentedDomainNode[] {
  const active =
    filters.gapsOnly || filters.assignedToMe || filters.unanswered;
  if (!active) {
    return [...domains];
  }

  return domains
    .map((domain) => ({
      ...domain,
      principles: domain.principles
        .map((principle) => ({
          ...principle,
          standards: principle.standards.filter((standard) => {
            if (filters.gapsOnly && !standard.hasGap) return false;
            if (filters.assignedToMe && !standard.assignedToMe) return false;
            if (filters.unanswered && !standard.isUnanswered) return false;
            return true;
          }),
        }))
        .filter((principle) => principle.standards.length > 0),
    }))
    .filter((domain) => domain.principles.length > 0);
}

export function countVisibleStandards(
  domains: readonly PresentedDomainNode[],
): number {
  return domains.reduce(
    (count, domain) =>
      count +
      domain.principles.reduce(
        (inner, principle) => inner + principle.standards.length,
        0,
      ),
    0,
  );
}

export function standardsWorkspaceAssignmentNote(
  locale: StandardsWorkspacePresentation["locale"],
): string {
  return uiLabel("standardsWorkspaceAssignmentNote", locale);
}
