import type { Locale } from "@eqa/content";
import { localize } from "@eqa/content";
import type { StandardConformanceSummary } from "./working-paper-review";
import {
  INITIAL_ITEM_STATUS,
  ITEM_STATUSES,
  STATUS_LABELS,
  type ItemStatus,
} from "./state-machine";
import type { QuestionnaireView } from "./types";

/** Matches {@link Role} in @eqa/auth — kept as strings to avoid a package cycle. */
export type DashboardRole = "cae" | "audit_staff" | "board";

export type ReadinessLevel = "green" | "amber" | "red";

export type StandardPhase = "not_started" | "in_progress" | "complete";

/**
 * Plain-language status labels for orientation UI. Distinct from machine
 * {@link STATUS_LABELS} — written for someone seeing the tool for the first time.
 */
export const UX_STATUS_LABELS: Record<
  ItemStatus,
  { en: string; ar: string; level: ReadinessLevel }
> = {
  not_assessed: {
    en: "Not started",
    ar: "لم يبدأ",
    level: "amber",
  },
  evidence_requested: {
    en: "Evidence needed",
    ar: "مطلوب أدلة",
    level: "amber",
  },
  evidence_submitted: {
    en: "Evidence submitted — awaiting review",
    ar: "قُدمت الأدلة — بانتظار المراجعة",
    level: "amber",
  },
  ai_flagged: {
    en: "Possible gap flagged — awaiting your review",
    ar: "فجوة محتملة — بانتظار مراجعتك",
    level: "amber",
  },
  under_human_review: {
    en: "Awaiting your review",
    ar: "بانتظار مراجعتك",
    level: "amber",
  },
  gap_confirmed: {
    en: "Gap found — being remediated",
    ar: "فجوة مؤكدة — قيد المعالجة",
    level: "red",
  },
  reviewed_no_gap: {
    en: "Reviewed — no gap",
    ar: "روجِع — لا توجد فجوة",
    level: "green",
  },
  remediation_in_progress: {
    en: "Gap found — being remediated",
    ar: "فجوة مؤكدة — قيد المعالجة",
    level: "red",
  },
  ready_for_retest: {
    en: "Remediation done — ready for re-test",
    ar: "اكتملت المعالجة — جاهز لإعادة الاختبار",
    level: "amber",
  },
  closed_ready: {
    en: "Ready",
    ar: "جاهز",
    level: "green",
  },
  not_applicable: {
    en: "Not applicable",
    ar: "لا ينطبق",
    level: "green",
  },
};

export const ROLE_LABELS: Record<DashboardRole, { en: string; ar: string }> = {
  cae: { en: "Chief Audit Executive", ar: "الرئيس التنفيذي للتدقيق" },
  audit_staff: { en: "Audit Staff", ar: "فريق التدقيق" },
  board: { en: "Board / Audit Committee", ar: "المجلس / لجنة التدقيق" },
};

const COMPLETE_STATUSES: ReadonlySet<ItemStatus> = new Set([
  "closed_ready",
  "reviewed_no_gap",
  "not_applicable",
]);

const GAP_STATUSES: ReadonlySet<ItemStatus> = new Set([
  "gap_confirmed",
  "remediation_in_progress",
]);

/** Numeric weight per item status for readiness scoring (0–100). */
const STATUS_SCORE: Record<ItemStatus, number> = {
  not_assessed: 0,
  evidence_requested: 25,
  evidence_submitted: 55,
  ai_flagged: 45,
  under_human_review: 50,
  gap_confirmed: 15,
  reviewed_no_gap: 85,
  remediation_in_progress: 30,
  ready_for_retest: 65,
  closed_ready: 100,
  not_applicable: 100,
};

export interface AssessmentProgress {
  readonly totalStandards: number;
  /** Standards with at least one question past `not_assessed`. */
  readonly startedCount: number;
  /** Standards where every question is `closed_ready`, `reviewed_no_gap`, or `not_applicable`. */
  readonly completedCount: number;
  readonly percentComplete: number;
  readonly notStartedCount: number;
  readonly inProgressCount: number;
}

export interface HeatMapCell {
  readonly standardNumber: string;
  readonly standardTitle: string;
  readonly domainNumber: string;
  readonly domainTitle: string;
  readonly principleNumber: string;
  readonly principleTitle: string;
  readonly phase: StandardPhase;
  readonly readinessScore: number;
  readonly readinessLevel: ReadinessLevel;
  readonly dominantStatus: ItemStatus;
  readonly questionCount: number;
  /** Present only for operational (detail) audiences. */
  readonly statusBreakdown?: Readonly<Partial<Record<ItemStatus, number>>>;
  readonly conformance?: StandardConformanceSummary;
}

export interface HeatMapDomain {
  readonly id: string;
  readonly number: string;
  readonly title: string;
  readonly principles: readonly HeatMapPrinciple[];
}

export interface HeatMapPrinciple {
  readonly id: string;
  readonly number: string;
  readonly title: string;
  readonly standards: readonly HeatMapCell[];
}

export interface PendingAction {
  readonly id: string;
  readonly count: number;
  readonly label: string;
  readonly priority: "high" | "medium" | "low";
}

export interface OverallReadiness {
  readonly score: number;
  readonly level: ReadinessLevel;
  readonly label: string;
}

export interface DashboardView {
  readonly assessmentId: string;
  readonly assessmentName: string;
  readonly locale: Locale;
  readonly role: DashboardRole;
  readonly isSummaryView: boolean;
  readonly progress: AssessmentProgress;
  readonly overallReadiness: OverallReadiness;
  readonly heatMap: readonly HeatMapDomain[];
  readonly pendingActions: readonly PendingAction[];
  readonly statusCounts: Readonly<Partial<Record<ItemStatus, number>>>;
}

export interface DashboardInput {
  readonly assessmentId: string;
  readonly assessmentName: LocalizedAssessmentName;
  readonly locale: Locale;
  readonly role: DashboardRole;
  readonly questionnaire: QuestionnaireView;
  readonly statusesByQuestion: ReadonlyMap<string, ItemStatus>;
  readonly conformanceByStandard?: ReadonlyMap<
    string,
    StandardConformanceSummary
  >;
  readonly pendingReviewCount?: number;
  /** Open remediation items past target date — from remediation store. */
  readonly remediationOverdueCount?: number;
}

interface LocalizedAssessmentName {
  readonly en: string;
  readonly ar: string;
}

/** Board sees summary; CAE and audit staff see operational detail. */
export function isSummaryView(role: DashboardRole): boolean {
  return role === "board";
}

/** Resolves the UX-oriented label for a workflow status in the given locale. */
export function uxStatusLabel(status: ItemStatus, locale: Locale): string {
  return localize(UX_STATUS_LABELS[status], locale);
}

/** Colour band for a workflow status (orientation badges). */
export function uxStatusLevel(status: ItemStatus): ReadinessLevel {
  return UX_STATUS_LABELS[status].level;
}

/** Machine status label from the content/state model (fallback). */
export function machineStatusLabel(status: ItemStatus, locale: Locale): string {
  return localize(STATUS_LABELS[status], locale);
}

function standardPhase(statuses: readonly ItemStatus[]): StandardPhase {
  if (statuses.length === 0) return "not_started";
  const allNotStarted = statuses.every((s) => s === INITIAL_ITEM_STATUS);
  if (allNotStarted) return "not_started";
  const allComplete = statuses.every((s) => COMPLETE_STATUSES.has(s));
  if (allComplete) return "complete";
  return "in_progress";
}

function dominantStatus(statuses: readonly ItemStatus[]): ItemStatus {
  const priority: ItemStatus[] = [
    "gap_confirmed",
    "remediation_in_progress",
    "ai_flagged",
    "under_human_review",
    "evidence_requested",
    "ready_for_retest",
    "evidence_submitted",
    "reviewed_no_gap",
    "not_assessed",
    "closed_ready",
    "not_applicable",
  ];
  for (const status of priority) {
    if (statuses.includes(status)) return status;
  }
  return INITIAL_ITEM_STATUS;
}

function averageStatusScore(statuses: readonly ItemStatus[]): number {
  if (statuses.length === 0) return 0;
  const sum = statuses.reduce((acc, s) => acc + STATUS_SCORE[s], 0);
  return sum / statuses.length;
}

/**
 * Computes a 0–100 readiness score for one standard, blending item statuses
 * with working-paper conformance (including unreviewed penalty).
 */
export function computeStandardReadiness(
  statuses: readonly ItemStatus[],
  conformance?: StandardConformanceSummary,
): { score: number; level: ReadinessLevel } {
  let score = averageStatusScore(statuses);

  if (statuses.some((s) => GAP_STATUSES.has(s))) {
    score = Math.min(score, 35);
  }

  if (conformance && conformance.totalItems > 0) {
    const reviewed =
      conformance.conforms +
      conformance.doesNotConform +
      conformance.notApplicable;
    const reviewedRatio = reviewed / conformance.totalItems;
    const conformDenom = conformance.conforms + conformance.doesNotConform;
    const conformRatio =
      conformDenom > 0 ? conformance.conforms / conformDenom : 1;
    const unreviewedPenalty =
      (conformance.unreviewed / conformance.totalItems) * 35;

    const conformanceScore = conformRatio * 100 * reviewedRatio;
    score = score * 0.55 + conformanceScore * 0.45 - unreviewedPenalty;

    if (conformance.doesNotConform > 0) {
      score = Math.min(score, 40);
    }
    if (conformance.unreviewed > 0) {
      score = Math.min(score, 75);
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const level = scoreToLevel(score, statuses, conformance);
  return { score, level };
}

function scoreToLevel(
  score: number,
  statuses: readonly ItemStatus[],
  conformance?: StandardConformanceSummary,
): ReadinessLevel {
  if (statuses.some((s) => GAP_STATUSES.has(s))) return "red";
  if (conformance && conformance.doesNotConform > 0) return "red";
  if (score >= 75 && (!conformance || conformance.unreviewed === 0)) {
    return "green";
  }
  if (score >= 40) return "amber";
  return "red";
}

/** Progress math: X of Y standards assessed, percent complete, phase counts. */
export function computeAssessmentProgress(
  questionnaire: QuestionnaireView,
  statusesByQuestion: ReadonlyMap<string, ItemStatus>,
): AssessmentProgress {
  let totalStandards = 0;
  let startedCount = 0;
  let completedCount = 0;

  for (const domain of questionnaire.domains) {
    for (const principle of domain.principles) {
      for (const standard of principle.standards) {
        totalStandards += 1;
        const statuses = standard.questions.map(
          (q) => statusesByQuestion.get(q.questionId) ?? INITIAL_ITEM_STATUS,
        );
        const phase = standardPhase(statuses);
        if (phase !== "not_started") startedCount += 1;
        if (phase === "complete") completedCount += 1;
      }
    }
  }

  const percentComplete =
    totalStandards > 0
      ? Math.round((completedCount / totalStandards) * 100)
      : 0;

  return {
    totalStandards,
    startedCount,
    completedCount,
    percentComplete,
    notStartedCount: totalStandards - startedCount,
    inProgressCount: startedCount - completedCount,
  };
}

function countStatuses(
  questionnaire: QuestionnaireView,
  statusesByQuestion: ReadonlyMap<string, ItemStatus>,
): Partial<Record<ItemStatus, number>> {
  const counts: Partial<Record<ItemStatus, number>> = {};
  for (const status of ITEM_STATUSES) {
    counts[status] = 0;
  }
  for (const domain of questionnaire.domains) {
    for (const principle of domain.principles) {
      for (const standard of principle.standards) {
        for (const question of standard.questions) {
          const status =
            statusesByQuestion.get(question.questionId) ?? INITIAL_ITEM_STATUS;
          counts[status] = (counts[status] ?? 0) + 1;
        }
      }
    }
  }
  return counts;
}

function buildStatusBreakdown(
  statuses: readonly ItemStatus[],
): Partial<Record<ItemStatus, number>> {
  const breakdown: Partial<Record<ItemStatus, number>> = {};
  for (const status of statuses) {
    breakdown[status] = (breakdown[status] ?? 0) + 1;
  }
  return breakdown;
}

const OVERALL_LABELS: Record<ReadinessLevel, { en: string; ar: string }> = {
  green: { en: "Ready", ar: "جاهز" },
  amber: { en: "In progress", ar: "قيد التقدم" },
  red: { en: "Gaps need attention", ar: "فجوات تحتاج اهتماماً" },
};

/** Aggregates standard scores into an overall readiness indicator. */
export function computeOverallReadiness(
  cells: readonly HeatMapCell[],
  locale: Locale,
): OverallReadiness {
  if (cells.length === 0) {
    return {
      score: 0,
      level: "amber",
      label: localize(OVERALL_LABELS.amber, locale),
    };
  }

  const score = Math.round(
    cells.reduce((sum, c) => sum + c.readinessScore, 0) / cells.length,
  );
  const hasRed = cells.some((c) => c.readinessLevel === "red");
  const allGreen = cells.every((c) => c.readinessLevel === "green");
  const level: ReadinessLevel = hasRed ? "red" : allGreen ? "green" : "amber";

  return {
    score,
    level,
    label: localize(OVERALL_LABELS[level], locale),
  };
}

const COCKPIT_QUEUE_ORDER = [
  "remediation-overdue",
  "ai-gaps-review",
  "answered-no-evidence",
  "not-started",
  "working-papers-test",
] as const;

/** Lean cockpit queue — operational roles only; board sees metrics without a queue. */
export function buildPendingActions(
  input: DashboardInput,
  progress: AssessmentProgress,
  conformanceByStandard: ReadonlyMap<string, StandardConformanceSummary>,
  locale: Locale,
): PendingAction[] {
  if (isSummaryView(input.role)) {
    return [];
  }

  const statusCounts = countStatuses(
    input.questionnaire,
    input.statusesByQuestion,
  );
  const actions: PendingAction[] = [];

  const overdueCount = input.remediationOverdueCount ?? 0;
  if (overdueCount > 0) {
    actions.push({
      id: "remediation-overdue",
      count: overdueCount,
      label: localize(
        {
          en: `${overdueCount} remediation item(s) overdue`,
          ar: `${overdueCount} بند(اً) معالجة متأخر(اً)`,
        },
        locale,
      ),
      priority: "high",
    });
  }

  const aiGaps =
    (input.pendingReviewCount ?? 0) + (statusCounts.ai_flagged ?? 0);
  if (aiGaps > 0) {
    actions.push({
      id: "ai-gaps-review",
      count: aiGaps,
      label: localize(
        {
          en: `${aiGaps} AI gap(s) awaiting review`,
          ar: `${aiGaps} فجوة(ات) من الذكاء الاصطناعي بانتظار المراجعة`,
        },
        locale,
      ),
      priority: "high",
    });
  }

  const answeredNoEvidence = statusCounts.evidence_requested ?? 0;
  if (answeredNoEvidence > 0) {
    actions.push({
      id: "answered-no-evidence",
      count: answeredNoEvidence,
      label: localize(
        {
          en: `${answeredNoEvidence} item(s) answered but no evidence yet`,
          ar: `${answeredNoEvidence} عنصر(اً) أُجيب عنه دون أدلة بعد`,
        },
        locale,
      ),
      priority: "medium",
    });
  }

  if (progress.notStartedCount > 0) {
    actions.push({
      id: "not-started",
      count: progress.notStartedCount,
      label: localize(
        {
          en: `${progress.notStartedCount} standard(s) not yet started`,
          ar: `${progress.notStartedCount} معيار(اً) لم يبدأ بعد`,
        },
        locale,
      ),
      priority: "low",
    });
  }

  let unreviewedWp = 0;
  for (const conf of conformanceByStandard.values()) {
    unreviewedWp += conf.unreviewed;
  }
  if (unreviewedWp > 0) {
    actions.push({
      id: "working-papers-test",
      count: unreviewedWp,
      label: localize(
        {
          en: `${unreviewedWp} working-paper item(s) to test`,
          ar: `${unreviewedWp} بند(اً) في أوراق العمل للاختبار`,
        },
        locale,
      ),
      priority: "medium",
    });
  }

  return actions.sort(
    (a, b) =>
      COCKPIT_QUEUE_ORDER.indexOf(
        a.id as (typeof COCKPIT_QUEUE_ORDER)[number],
      ) -
      COCKPIT_QUEUE_ORDER.indexOf(
        b.id as (typeof COCKPIT_QUEUE_ORDER)[number],
      ),
  );
}

/** Assembles the full dashboard view for a role and locale. */
export function buildDashboardView(input: DashboardInput): DashboardView {
  const summary = isSummaryView(input.role);
  const conformanceByStandard = input.conformanceByStandard ?? new Map();
  const progress = computeAssessmentProgress(
    input.questionnaire,
    input.statusesByQuestion,
  );

  const heatMap: HeatMapDomain[] = input.questionnaire.domains.map(
    (domain) => ({
      id: domain.id,
      number: domain.number,
      title: domain.title,
      principles: domain.principles.map((principle) => ({
        id: principle.id,
        number: principle.number,
        title: principle.title,
        standards: principle.standards.map((standard) => {
          const statuses = standard.questions.map(
            (q) =>
              input.statusesByQuestion.get(q.questionId) ?? INITIAL_ITEM_STATUS,
          );
          const conformance = conformanceByStandard.get(standard.number);
          const { score, level } = computeStandardReadiness(
            statuses,
            conformance,
          );
          const cell: HeatMapCell = {
            standardNumber: standard.number,
            standardTitle: standard.title,
            domainNumber: domain.number,
            domainTitle: domain.title,
            principleNumber: principle.number,
            principleTitle: principle.title,
            phase: standardPhase(statuses),
            readinessScore: score,
            readinessLevel: level,
            dominantStatus: dominantStatus(statuses),
            questionCount: standard.questions.length,
            ...(conformance === undefined ? {} : { conformance }),
            ...(summary
              ? {}
              : { statusBreakdown: buildStatusBreakdown(statuses) }),
          };
          return cell;
        }),
      })),
    }),
  );

  const allCells = heatMap.flatMap((d) =>
    d.principles.flatMap((p) => p.standards),
  );
  const overallReadiness = computeOverallReadiness(allCells, input.locale);
  const pendingActions = buildPendingActions(
    input,
    progress,
    conformanceByStandard,
    input.locale,
  );
  const statusCounts = countStatuses(
    input.questionnaire,
    input.statusesByQuestion,
  );

  return {
    assessmentId: input.assessmentId,
    assessmentName: localize(input.assessmentName, input.locale),
    locale: input.locale,
    role: input.role,
    isSummaryView: summary,
    progress,
    overallReadiness,
    heatMap,
    pendingActions,
    statusCounts,
  };
}
