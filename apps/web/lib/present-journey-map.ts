import {
  createSyntheticRemediationView,
  type DashboardRole,
  type DashboardView,
  type HeatMapCell,
  type ItemStatus,
} from "@eqa/workflows";
import { buildEvidencePackPresentation } from "./present-evidence-pack";
import { buildMockEqaPresentation } from "./present-mock-eqa";

export type JourneyCheckpointState =
  | "cleared"
  | "in-progress"
  | "not-started"
  | "blocked";

export type JourneyCheckpointId =
  | "scope"
  | "evidence"
  | "gaps-identified"
  | "methodology"
  | "remediation"
  | "mock-eqa"
  | "evidence-pack";

export interface JourneyCheckpoint {
  readonly id: JourneyCheckpointId;
  readonly step: number;
  readonly labelEn: string;
  readonly labelAr: string;
  readonly href:
    | "/dashboard"
    | "/findings"
    | "/remediation"
    | "/mock-eqa"
    | "/evidence-pack";
  readonly percent: number;
  readonly metricEn: string;
  readonly metricAr: string;
  readonly state: JourneyCheckpointState;
}

export interface JourneyMapPresentation {
  readonly checkpoints: readonly JourneyCheckpoint[];
  readonly finishPercent: number;
  readonly finishLabelEn: string;
  readonly finishLabelAr: string;
  readonly pathFillPercent: number;
}

const EVIDENCE_COLLECTED_STATUSES: readonly ItemStatus[] = [
  "evidence_submitted",
  "ai_flagged",
  "under_human_review",
  "gap_confirmed",
  "reviewed_no_gap",
  "remediation_in_progress",
  "ready_for_retest",
  "closed_ready",
  "not_applicable",
];

const GAP_REVIEWED_STATUSES: readonly ItemStatus[] = [
  "ai_flagged",
  "under_human_review",
  "gap_confirmed",
  "reviewed_no_gap",
  "remediation_in_progress",
  "ready_for_retest",
  "closed_ready",
  "not_applicable",
];

const REMEDIATION_CLOSED: readonly ItemStatus[] = [
  "closed_ready",
  "reviewed_no_gap",
  "not_applicable",
];

function sumStatusCounts(
  statusCounts: DashboardView["statusCounts"],
  statuses: readonly ItemStatus[],
): number {
  return statuses.reduce((sum, status) => sum + (statusCounts[status] ?? 0), 0);
}

function totalQuestions(statusCounts: DashboardView["statusCounts"]): number {
  return Object.values(statusCounts).reduce((sum, n) => sum + (n ?? 0), 0);
}

function flattenHeatMapCells(view: DashboardView): readonly HeatMapCell[] {
  return view.heatMap.flatMap((domain) =>
    domain.principles.flatMap((principle) => principle.standards),
  );
}

function methodologyMetrics(cells: readonly HeatMapCell[]): {
  reviewed: number;
  total: number;
  nonConforming: number;
  unreviewed: number;
} {
  let reviewed = 0;
  let total = 0;
  let nonConforming = 0;
  let unreviewed = 0;

  for (const cell of cells) {
    if (!cell.conformance) continue;
    const c = cell.conformance;
    reviewed += c.conforms + c.doesNotConform;
    total += c.conforms + c.doesNotConform + c.unreviewed;
    nonConforming += c.doesNotConform;
    unreviewed += c.unreviewed;
  }

  return { reviewed, total, nonConforming, unreviewed };
}

function deriveState(
  percent: number,
  blocked: boolean,
): JourneyCheckpointState {
  if (blocked) return "blocked";
  if (percent >= 100) return "cleared";
  if (percent > 0) return "in-progress";
  return "not-started";
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Binds journey checkpoints to dashboard, remediation, mock-EQA, and pack views. */
export function buildJourneyMapPresentation(
  view: DashboardView,
  role: DashboardRole,
): JourneyMapPresentation {
  const locale = view.locale;
  const { progress, statusCounts, overallReadiness, pendingActions } = view;
  const totalQ = totalQuestions(statusCounts);
  const cells = flattenHeatMapCells(view);

  const scopePercent =
    progress.totalStandards > 0
      ? clampPercent((progress.startedCount / progress.totalStandards) * 100)
      : 0;

  const evidenceCollected = sumStatusCounts(
    statusCounts,
    EVIDENCE_COLLECTED_STATUSES,
  );
  const evidencePercent =
    totalQ > 0 ? clampPercent((evidenceCollected / totalQ) * 100) : 0;

  const gapsReviewed = sumStatusCounts(statusCounts, GAP_REVIEWED_STATUSES);
  const gapsPercent =
    totalQ > 0 ? clampPercent((gapsReviewed / totalQ) * 100) : 0;
  const pendingDraftReview = pendingActions.some(
    (a) => a.id === "draft-findings" && a.priority === "high",
  );

  const methodology = methodologyMetrics(cells);
  const methodologyPercent =
    methodology.total > 0
      ? clampPercent((methodology.reviewed / methodology.total) * 100)
      : 0;

  const remediationView = createSyntheticRemediationView(locale, role);
  const remediationTotal = remediationView.items.length;
  const remediationClosed = remediationView.items.filter((item) =>
    REMEDIATION_CLOSED.includes(item.itemStatus),
  ).length;
  const remediationPercent =
    remediationTotal > 0
      ? clampPercent(
          ((remediationTotal - remediationView.openCount) / remediationTotal) *
            100,
        )
      : remediationView.openCount === 0
        ? 100
        : 0;

  const mockEqa = buildMockEqaPresentation(locale, role);
  const mockPercent = clampPercent(mockEqa.overallScore);

  const evidencePack = buildEvidencePackPresentation(locale, role);
  const packPercent = clampPercent(evidencePack.readinessScore);

  const checkpoints: JourneyCheckpoint[] = [
    {
      id: "scope",
      step: 1,
      labelEn: "Scope & self-assess",
      labelAr: "النطاق والتقييم الذاتي",
      href: "/dashboard",
      percent: scopePercent,
      metricEn: `${progress.startedCount}/${progress.totalStandards} standards started`,
      metricAr: `${progress.startedCount}/${progress.totalStandards} معيار بدأ`,
      state: deriveState(scopePercent, false),
    },
    {
      id: "evidence",
      step: 2,
      labelEn: "Evidence collected",
      labelAr: "جمع الأدلة",
      href: "/dashboard",
      percent: evidencePercent,
      metricEn: `${evidenceCollected}/${totalQ} items with evidence`,
      metricAr: `${evidenceCollected}/${totalQ} عنصر مع أدلة`,
      state: deriveState(evidencePercent, false),
    },
    {
      id: "gaps-identified",
      step: 3,
      labelEn: "Gaps identified",
      labelAr: "تحديد الفجوات",
      href: "/findings",
      percent: gapsPercent,
      metricEn: `${gapsReviewed}/${totalQ} items reviewed`,
      metricAr: `${gapsReviewed}/${totalQ} عنصر روجِع`,
      state: deriveState(gapsPercent, pendingDraftReview),
    },
    {
      id: "methodology",
      step: 4,
      labelEn: "Methodology tested",
      labelAr: "اختبار المنهجية",
      href: "/dashboard",
      percent: methodologyPercent,
      metricEn: `${methodology.reviewed}/${methodology.total} WP items reviewed`,
      metricAr: `${methodology.reviewed}/${methodology.total} عنصر ورقة عمل روجِع`,
      state: deriveState(
        methodologyPercent,
        methodology.nonConforming > 0 && remediationView.openCount > 0,
      ),
    },
    {
      id: "remediation",
      step: 5,
      labelEn: "Gaps remediated",
      labelAr: "معالجة الفجوات",
      href: "/remediation",
      percent: remediationPercent,
      metricEn:
        remediationTotal > 0
          ? `${remediationClosed}/${remediationTotal} remediations closed`
          : "No open remediations",
      metricAr:
        remediationTotal > 0
          ? `${remediationClosed}/${remediationTotal} معالجة مغلقة`
          : "لا معالجات مفتوحة",
      state: deriveState(
        remediationPercent,
        remediationView.overdueCount > 0,
      ),
    },
    {
      id: "mock-eqa",
      step: 6,
      labelEn: "Mock assessment passed",
      labelAr: "اجتياز المحاكاة",
      href: "/mock-eqa",
      percent: mockPercent,
      metricEn: `${mockPercent}% readiness simulation`,
      metricAr: `محاكاة جاهزية ${mockPercent}%`,
      state:
        mockEqa.overallLevel === "green"
          ? "cleared"
          : mockEqa.overallLevel === "red"
            ? "blocked"
            : deriveState(mockPercent, false),
    },
    {
      id: "evidence-pack",
      step: 7,
      labelEn: "Evidence pack ready",
      labelAr: "حزمة الأدلة جاهزة",
      href: "/evidence-pack",
      percent: packPercent,
      metricEn: `${packPercent}% pack readiness`,
      metricAr: `جاهزية الحزمة ${packPercent}%`,
      state:
        packPercent >= 75
          ? "cleared"
          : packPercent >= 40
            ? "in-progress"
            : packPercent > 0
              ? "blocked"
              : "not-started",
    },
  ];

  return {
    checkpoints,
    finishPercent: clampPercent(overallReadiness.score),
    finishLabelEn: "EQA-Ready",
    finishLabelAr: "جاهز لـ EQA",
    pathFillPercent: clampPercent(overallReadiness.score),
  };
}
