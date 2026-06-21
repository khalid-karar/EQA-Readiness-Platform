import type { StandardsWorkspaceLoadResult } from "@eqa/db";
import type { Locale } from "@eqa/content";
import {
  buildDashboardView,
  createSyntheticDashboardInput,
  createSeeraDemoRemediationItems,
  createSeeraDemoResponses,
  ROLE_LABELS,
  uxStatusLabel,
  type DashboardRole,
  type HeatMapCell,
  type ItemStatus,
} from "@eqa/workflows";
import type {
  PresentedDomainNode,
  StandardsWorkspacePresentation,
} from "./standards-workspace-shared";

export type {
  PresentedDomainNode,
  PresentedPrincipleNode,
  PresentedStandardNode,
  StandardsWorkspaceFilters,
  StandardsWorkspacePresentation,
} from "./standards-workspace-shared";

export {
  countVisibleStandards,
  filterStandardsWorkspaceTree,
  standardsWorkspaceAssignmentNote,
} from "./standards-workspace-shared";

const GAP_STATUSES: ReadonlySet<ItemStatus> = new Set([
  "gap_confirmed",
  "remediation_in_progress",
]);

function ownerMatchesCurrentUser(
  owner: string,
  userId: string,
  role: DashboardRole,
  locale: Locale,
): boolean {
  const normalized = owner.trim().toLowerCase();
  if (normalized.length === 0) return false;
  if (normalized === userId.toLowerCase()) return true;
  for (const label of [
    ROLE_LABELS[role][locale],
    ROLE_LABELS[role].en,
    ROLE_LABELS[role].ar,
  ]) {
    if (normalized === label.toLowerCase()) return true;
  }
  return false;
}

function latestResponsesByQuestion(
  responses: readonly { questionId: string; answer: string }[],
): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const response of responses) {
    map.set(response.questionId, response.answer);
  }
  return map;
}

function ownersForStandard(
  questionIds: readonly string[],
  remediationByQuestion: ReadonlyMap<string, string>,
): string | null {
  const owners = new Set<string>();
  for (const questionId of questionIds) {
    const owner = remediationByQuestion.get(questionId);
    if (owner) owners.add(owner);
  }
  if (owners.size === 0) return null;
  return [...owners].join(", ");
}

function isAssignedToMe(
  questionIds: readonly string[],
  remediationByQuestion: ReadonlyMap<string, string>,
  userId: string,
  role: DashboardRole,
  locale: Locale,
): boolean {
  for (const questionId of questionIds) {
    const owner = remediationByQuestion.get(questionId);
    if (owner && ownerMatchesCurrentUser(owner, userId, role, locale)) {
      return true;
    }
  }
  return false;
}

function presentStandardNode(
  cell: HeatMapCell,
  questionIds: readonly string[],
  responsesByQuestion: ReadonlyMap<string, string>,
  remediationByQuestion: ReadonlyMap<string, string>,
  locale: Locale,
  role: DashboardRole,
  userId: string,
) {
  const answeredCount = questionIds.filter((id) =>
    responsesByQuestion.has(id),
  ).length;
  const questionCount = questionIds.length;
  const isUnanswered =
    questionCount > 0 && answeredCount < questionCount;
  const hasGap =
    cell.readinessLevel === "red" ||
    GAP_STATUSES.has(cell.dominantStatus);

  const params = new URLSearchParams({ locale, role });
  const detailHref = `/standards/${encodeURIComponent(cell.standardNumber)}?${params.toString()}`;

  return {
    standardNumber: cell.standardNumber,
    standardTitle: cell.standardTitle,
    readinessLevel: cell.readinessLevel,
    dominantStatus: cell.dominantStatus,
    statusLabel: uxStatusLabel(cell.dominantStatus, locale),
    answeredCount,
    questionCount,
    hasGap,
    isUnanswered,
    assignedToMe: isAssignedToMe(
      questionIds,
      remediationByQuestion,
      userId,
      role,
      locale,
    ),
    ownerLabel: ownersForStandard(questionIds, remediationByQuestion),
    detailHref,
  };
}

function buildPresentationFromParts(
  locale: Locale,
  role: DashboardRole,
  userId: string,
  assessmentName: { en: string; ar: string },
  dashboardInput: StandardsWorkspaceLoadResult["dashboardInput"],
  responses: readonly { questionId: string; answer: string }[],
  remediationItems: readonly { questionId: string; owner: string }[],
  questionIdsByStandard: ReadonlyMap<string, readonly string[]>,
): StandardsWorkspacePresentation {
  const view = buildDashboardView(dashboardInput);
  const responsesByQuestion = latestResponsesByQuestion(responses);
  const remediationByQuestion = new Map(
    remediationItems.map((item) => [item.questionId, item.owner]),
  );

  const domains: PresentedDomainNode[] = view.heatMap.map((domain) => ({
    id: domain.id,
    number: domain.number,
    title: domain.title,
    principles: domain.principles.map((principle) => ({
      id: principle.id,
      number: principle.number,
      title: principle.title,
      standards: principle.standards.map((cell) =>
        presentStandardNode(
          cell,
          questionIdsByStandard.get(cell.standardNumber) ?? [],
          responsesByQuestion,
          remediationByQuestion,
          locale,
          role,
          userId,
        ),
      ),
    })),
  }));

  const totalStandards = domains.reduce(
    (count, domain) =>
      count +
      domain.principles.reduce(
        (inner, principle) => inner + principle.standards.length,
        0,
      ),
    0,
  );

  return {
    locale,
    role,
    roleLabel: ROLE_LABELS[role][locale],
    userId,
    assessmentName: assessmentName[locale],
    supportsStandardAssignment: false,
    domains,
    totalStandards,
  };
}

export function buildStandardsWorkspacePresentationFromLoad(
  load: StandardsWorkspaceLoadResult,
): StandardsWorkspacePresentation {
  const { dashboardInput } = load;
  return buildPresentationFromParts(
    dashboardInput.locale,
    dashboardInput.role,
    load.userId,
    dashboardInput.assessmentName,
    dashboardInput,
    load.responses,
    load.remediationItems,
    load.questionIdsByStandard,
  );
}

export function buildStandardsWorkspacePresentation(
  locale: Locale,
  role: DashboardRole,
): StandardsWorkspacePresentation {
  const dashboardInput = createSyntheticDashboardInput(locale, role);
  const questionIdsByStandard = new Map<string, string[]>();
  for (const domain of dashboardInput.questionnaire.domains) {
    for (const principle of domain.principles) {
      for (const standard of principle.standards) {
        questionIdsByStandard.set(
          standard.number,
          standard.questions.map((q) => q.questionId),
        );
      }
    }
  }

  return buildPresentationFromParts(
    locale,
    role,
    `user-seera-pilot-${role}`,
    dashboardInput.assessmentName,
    dashboardInput,
    createSeeraDemoResponses(locale),
    createSeeraDemoRemediationItems(locale),
    questionIdsByStandard,
  );
}
