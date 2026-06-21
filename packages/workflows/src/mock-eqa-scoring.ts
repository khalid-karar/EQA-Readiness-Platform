import { randomUUID } from "node:crypto";
import type { Locale } from "@eqa/content";
import { localize } from "@eqa/content";
import type { FinalConclusion } from "./findings";
import {
  computeStandardReadiness,
  isSummaryView,
  type DashboardRole,
  type ReadinessLevel,
} from "./readiness-dashboard";
import { INITIAL_ITEM_STATUS, type ItemStatus } from "./state-machine";
import type { QuestionnaireView, StandardView } from "./types";
import type { StandardConformanceSummary } from "./working-paper-review";

/**
 * Kind discriminant for a mock-EQA readiness simulation. Distinct from
 * {@link FORMAL_ASSESSMENT_RESULT_KIND} so a simulation can never be typed as or
 * promoted to an official external-assessor conclusion.
 */
export const READINESS_SIMULATION_KIND = "readiness_simulation" as const;

/**
 * Kind reserved for formal external-assessor conclusions. Mock-EQA never
 * produces this kind — it exists only so downstream code can demand a formal
 * result and reject a simulation at the type/runtime boundary.
 */
export const FORMAL_ASSESSMENT_RESULT_KIND =
  "formal_assessment_conclusion" as const;

export type AssessmentResultKind =
  | typeof READINESS_SIMULATION_KIND
  | typeof FORMAL_ASSESSMENT_RESULT_KIND;

/**
 * Prominent disclaimer text — included in every simulation result and surfaced
 * unavoidably in UI and exports. This score is preparation support only.
 */
export const MOCK_EQA_DISCLAIMER = {
  en:
    "READINESS SIMULATION ONLY — This simulated score supports EQA preparation. " +
    "It does NOT replace the independent external assessor or formal conformance " +
    "conclusions. No rating here is an official assessment result.",
  ar:
    "محاكاة الجاهزية فقط — هذه الدرجة المحاكية تدعم الاستعداد لـ EQA. لا تحل محل " +
    "المقيّم الخارجي المستقل أو استنتاجات المطابقة الرسمية. لا يُعد أي تقييم هنا " +
    "نتيجة تقييم رسمية.",
  shortEn: "Simulated readiness — not an official EQA conclusion",
  shortAr: "جاهزية محاكية — ليست استنتاجاً رسمياً لـ EQA",
} as const;

export type DrivingGapSource =
  | "confirmed_gap_status"
  | "human_reviewed_finding"
  | "wp_non_conformance"
  | "wp_unreviewed"
  | "pending_human_review"
  | "not_started";

export interface DrivingGap {
  readonly id: string;
  readonly standardNumber: string;
  readonly questionId?: string;
  readonly source: DrivingGapSource;
  readonly summary: string;
}

export interface MockEqaRating {
  readonly score: number;
  readonly level: ReadinessLevel;
  readonly label: string;
}

export interface MockEqaStandardRating {
  readonly standardNumber: string;
  readonly standardTitle: string;
  readonly principleNumber: string;
  readonly principleTitle: string;
  readonly rating: MockEqaRating;
  readonly drivingGaps: readonly DrivingGap[];
}

export interface MockEqaDomainRating {
  readonly domainNumber: string;
  readonly domainTitle: string;
  readonly rating: MockEqaRating;
  readonly standards: readonly MockEqaStandardRating[];
}

/**
 * A mock-EQA readiness simulation result. By type it is never a formal
 * assessment conclusion — `kind` is the literal {@link READINESS_SIMULATION_KIND}
 * and {@link disclaimer} is always present.
 */
export interface MockEqaSimulationResult {
  readonly kind: typeof READINESS_SIMULATION_KIND;
  readonly simulationId: string;
  readonly assessmentId: string;
  readonly runAt: string;
  readonly runBy: string;
  readonly locale: Locale;
  readonly overall: MockEqaRating;
  readonly domains: readonly MockEqaDomainRating[];
  readonly disclaimer: typeof MOCK_EQA_DISCLAIMER;
}

/** Formal external-assessor conclusion — never produced by mock-EQA. */
export interface FormalAssessmentResult {
  readonly kind: typeof FORMAL_ASSESSMENT_RESULT_KIND;
  readonly assessmentId: string;
  readonly issuedBy: string;
  readonly issuedAt: string;
  readonly overallRating: string;
}

export type AssessmentResult = MockEqaSimulationResult | FormalAssessmentResult;

export interface MockEqaScoringInput {
  readonly assessmentId: string;
  readonly assessmentName: { readonly en: string; readonly ar: string };
  readonly locale: Locale;
  readonly questionnaire: QuestionnaireView;
  readonly statusesByQuestion: ReadonlyMap<string, ItemStatus>;
  readonly finalConclusions: readonly FinalConclusion[];
  readonly conformanceByStandard?: ReadonlyMap<
    string,
    StandardConformanceSummary
  >;
  readonly simulationId?: string;
  readonly runAt?: string;
  readonly runBy?: string;
}

export interface MockEqaSimulationView {
  readonly assessmentId: string;
  readonly assessmentName: string;
  readonly locale: Locale;
  readonly role: DashboardRole;
  readonly isSummaryView: boolean;
  readonly canRunSimulation: boolean;
  readonly simulation: MockEqaSimulationResult;
}

const GAP_STATUSES: ReadonlySet<ItemStatus> = new Set([
  "gap_confirmed",
  "remediation_in_progress",
]);

const PENDING_REVIEW_STATUSES: ReadonlySet<ItemStatus> = new Set([
  "ai_flagged",
  "under_human_review",
]);

/** Unique id for a persisted mock-EQA run (distinct per simulation). */
export function createMockEqaSimulationId(): string {
  return `sim-${randomUUID()}`;
}

/** True when `value` is a {@link MockEqaSimulationResult}. */
export function isReadinessSimulation(
  value: unknown,
): value is MockEqaSimulationResult {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { kind?: unknown }).kind === READINESS_SIMULATION_KIND
  );
}

/** True when `value` is a {@link FormalAssessmentResult}. */
export function isFormalAssessmentResult(
  value: unknown,
): value is FormalAssessmentResult {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { kind?: unknown }).kind === FORMAL_ASSESSMENT_RESULT_KIND
  );
}

/** Localized readiness band label for orientation UI. */
export function readinessRatingLabel(
  level: ReadinessLevel,
  locale: Locale,
): string {
  const labels: Record<ReadinessLevel, { en: string; ar: string }> = {
    green: { en: "Ready band", ar: "نطاق جاهز" },
    amber: { en: "Preparation needed", ar: "يحتاج استعداداً" },
    red: { en: "Significant gaps", ar: "فجوات جوهرية" },
  };
  return localize(labels[level], locale);
}

function overallLabel(score: number, locale: Locale): string {
  if (score >= 75) {
    return locale === "ar"
      ? "جاهزية محاكية — نطاق جاهز"
      : "Simulated readiness — ready band";
  }
  if (score >= 40) {
    return locale === "ar"
      ? "جاهزية محاكية — يحتاج استعداداً"
      : "Simulated readiness — preparation needed";
  }
  return locale === "ar"
    ? "جاهزية محاكية — فجوات جوهرية"
    : "Simulated readiness — significant gaps";
}

function makeRating(
  score: number,
  level: ReadinessLevel,
  locale: Locale,
): MockEqaRating {
  return {
    score,
    level,
    label: readinessRatingLabel(level, locale),
  };
}

function averageScore(scores: readonly number[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((a, b) => a + b, 0);
  return Math.round(sum / scores.length);
}

function aggregateLevel(
  scores: readonly number[],
  levels: readonly ReadinessLevel[],
): ReadinessLevel {
  if (levels.some((l) => l === "red")) return "red";
  const avg = averageScore(scores);
  if (avg >= 75 && !levels.some((l) => l === "amber")) return "green";
  if (avg >= 40) return "amber";
  return "red";
}

function gapSummaryForStatus(status: ItemStatus, locale: Locale): string {
  const en: Record<ItemStatus, string> = {
    not_assessed: "Assessment item not started",
    evidence_requested: "Evidence still needed",
    evidence_submitted: "Evidence submitted — review pending",
    ai_flagged: "Possible gap flagged — awaiting human review",
    under_human_review: "Awaiting human review",
    gap_confirmed: "Confirmed gap — remediation required",
    reviewed_no_gap: "Reviewed — no gap",
    remediation_in_progress: "Confirmed gap — remediation in progress",
    ready_for_retest: "Remediation complete — retest pending",
    closed_ready: "Ready",
    not_applicable: "Not applicable",
  };
  const ar: Record<ItemStatus, string> = {
    not_assessed: "عنصر التقييم لم يبدأ",
    evidence_requested: "لا تزال الأدلة مطلوبة",
    evidence_submitted: "قُدمت الأدلة — المراجعة معلقة",
    ai_flagged: "فجوة محتملة — بانتظار المراجعة البشرية",
    under_human_review: "بانتظار المراجعة البشرية",
    gap_confirmed: "فجوة مؤكدة — المعالجة مطلوبة",
    reviewed_no_gap: "روجِع — لا توجد فجوة",
    remediation_in_progress: "فجوة مؤكدة — المعالجة قيد التنفيذ",
    ready_for_retest: "اكتملت المعالجة — إعادة الاختبار معلقة",
    closed_ready: "جاهز",
    not_applicable: "لا ينطبق",
  };
  return locale === "ar" ? ar[status] : en[status];
}

function collectDrivingGaps(
  standard: StandardView,
  statusesByQuestion: ReadonlyMap<string, ItemStatus>,
  conclusionsByQuestion: ReadonlyMap<string, FinalConclusion>,
  conformance: StandardConformanceSummary | undefined,
  locale: Locale,
): DrivingGap[] {
  const gaps: DrivingGap[] = [];

  for (const question of standard.questions) {
    const status =
      statusesByQuestion.get(question.questionId) ?? INITIAL_ITEM_STATUS;
    const conclusion = conclusionsByQuestion.get(question.questionId);

    if (GAP_STATUSES.has(status)) {
      gaps.push({
        id: `${standard.number}::${question.questionId}::gap`,
        standardNumber: standard.number,
        questionId: question.questionId,
        source: "confirmed_gap_status",
        summary: gapSummaryForStatus(status, locale),
      });
      if (conclusion) {
        gaps.push({
          id: `${standard.number}::${question.questionId}::finding`,
          standardNumber: standard.number,
          questionId: question.questionId,
          source: "human_reviewed_finding",
          summary:
            locale === "ar"
              ? `نتيجة المراجعة البشرية: ${conclusion.conclusion}`
              : `Human-reviewed finding: ${conclusion.conclusion}`,
        });
      }
      continue;
    }

    if (PENDING_REVIEW_STATUSES.has(status)) {
      gaps.push({
        id: `${standard.number}::${question.questionId}::review`,
        standardNumber: standard.number,
        questionId: question.questionId,
        source: "pending_human_review",
        summary: gapSummaryForStatus(status, locale),
      });
      continue;
    }

    if (status === "not_assessed") {
      gaps.push({
        id: `${standard.number}::${question.questionId}::not-started`,
        standardNumber: standard.number,
        questionId: question.questionId,
        source: "not_started",
        summary: gapSummaryForStatus(status, locale),
      });
    }
  }

  if (conformance) {
    if (conformance.doesNotConform > 0) {
      gaps.push({
        id: `${standard.number}::wp-non-conformance`,
        standardNumber: standard.number,
        source: "wp_non_conformance",
        summary:
          locale === "ar"
            ? `${conformance.doesNotConform} بند(بنود) في أوراق العمل لا يطابق`
            : `${conformance.doesNotConform} working-paper item(s) do not conform`,
      });
    }
    if (conformance.unreviewed > 0) {
      gaps.push({
        id: `${standard.number}::wp-unreviewed`,
        standardNumber: standard.number,
        source: "wp_unreviewed",
        summary:
          locale === "ar"
            ? `${conformance.unreviewed} بند(بنود) في أوراق العمل غير مراجَع`
            : `${conformance.unreviewed} working-paper item(s) unreviewed`,
      });
    }
  }

  return gaps;
}

/**
 * Pure mock-EQA scoring: blends item statuses (Step 8), human-reviewed findings
 * (Step 11, via resulting statuses and conclusions), and working-paper
 * conformance rollups including unreviewed (Step 12). Returns per-domain,
 * per-standard, and overall simulated ratings with driving gaps surfaced.
 */
export function computeMockEqaSimulation(
  input: MockEqaScoringInput,
): MockEqaSimulationResult {
  const conformanceByStandard = input.conformanceByStandard ?? new Map();
  const conclusionsByQuestion = new Map(
    input.finalConclusions.map((c) => [c.questionId, c]),
  );
  const locale = input.locale;

  const domains: MockEqaDomainRating[] = input.questionnaire.domains.map(
    (domain) => {
      const standardRatings: MockEqaStandardRating[] = [];

      for (const principle of domain.principles) {
        for (const standard of principle.standards) {
          const statuses = standard.questions.map(
            (q) =>
              input.statusesByQuestion.get(q.questionId) ?? INITIAL_ITEM_STATUS,
          );
          const conformance = conformanceByStandard.get(standard.number);
          const { score, level } = computeStandardReadiness(
            statuses,
            conformance,
          );
          standardRatings.push({
            standardNumber: standard.number,
            standardTitle: standard.title,
            principleNumber: principle.number,
            principleTitle: principle.title,
            rating: makeRating(score, level, locale),
            drivingGaps: collectDrivingGaps(
              standard,
              input.statusesByQuestion,
              conclusionsByQuestion,
              conformance,
              locale,
            ),
          });
        }
      }

      const standardScores = standardRatings.map((s) => s.rating.score);
      const standardLevels = standardRatings.map((s) => s.rating.level);
      const domainScore = averageScore(standardScores);
      const domainLevel = aggregateLevel(standardScores, standardLevels);

      return {
        domainNumber: domain.number,
        domainTitle: domain.title,
        rating: makeRating(domainScore, domainLevel, locale),
        standards: standardRatings,
      };
    },
  );

  const allStandardScores = domains.flatMap((d) =>
    d.standards.map((s) => s.rating.score),
  );
  const allStandardLevels = domains.flatMap((d) =>
    d.standards.map((s) => s.rating.level),
  );
  const overallScore = averageScore(allStandardScores);
  const overallLevel = aggregateLevel(allStandardScores, allStandardLevels);

  return {
    kind: READINESS_SIMULATION_KIND,
    simulationId: input.simulationId ?? createMockEqaSimulationId(),
    assessmentId: input.assessmentId,
    runAt: input.runAt ?? new Date().toISOString(),
    runBy: input.runBy ?? "system:mock-eqa",
    locale,
    overall: {
      score: overallScore,
      level: overallLevel,
      label: overallLabel(overallScore, locale),
    },
    domains,
    disclaimer: MOCK_EQA_DISCLAIMER,
  };
}

/** Builds the orientation UI view for a completed simulation. */
export function buildMockEqaSimulationView(
  input: MockEqaScoringInput & {
    readonly role: DashboardRole;
    readonly simulation?: MockEqaSimulationResult;
  },
): MockEqaSimulationView {
  const simulation = input.simulation ?? computeMockEqaSimulation(input);
  const summary = isSummaryView(input.role);

  return {
    assessmentId: input.assessmentId,
    assessmentName: localize(input.assessmentName, input.locale),
    locale: input.locale,
    role: input.role,
    isSummaryView: summary,
    canRunSimulation: !summary,
    simulation,
  };
}
