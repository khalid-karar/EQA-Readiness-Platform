import { describe, expect, it } from "vitest";
import { createSyntheticDashboardInput } from "./synthetic-dashboard";
import {
  buildDashboardView,
  computeAssessmentProgress,
  computeOverallReadiness,
  computeStandardReadiness,
  isSummaryView,
  uxStatusLabel,
  type HeatMapCell,
} from "./readiness-dashboard";

describe("readiness dashboard (Step 13 UI data)", () => {
  const inputEn = createSyntheticDashboardInput("en", "cae");
  const inputBoard = createSyntheticDashboardInput("en", "board");

  it("counts reviewed_no_gap as complete alongside closed_ready", () => {
    const progress = computeAssessmentProgress(
      inputEn.questionnaire,
      new Map([
        ["Q-1-1-1", "closed_ready"],
        ["Q-1-1-2", "reviewed_no_gap"],
        ["Q-1-2-1", "not_assessed"],
        ["Q-1-2-2", "not_assessed"],
        ["Q-2-1-1", "not_assessed"],
        ["Q-2-1-2", "not_assessed"],
      ]),
    );
    expect(progress.completedCount).toBe(1);
    expect(progress.percentComplete).toBe(33);
  });

  it("computeAssessmentProgress counts started and completed standards", () => {
    const progress = computeAssessmentProgress(
      inputEn.questionnaire,
      inputEn.statusesByQuestion,
    );
    expect(progress.totalStandards).toBe(3);
    expect(progress.startedCount).toBe(3);
    expect(progress.completedCount).toBe(1);
    expect(progress.notStartedCount).toBe(0);
    expect(progress.inProgressCount).toBe(2);
    expect(progress.percentComplete).toBe(33);
  });

  it("computeStandardReadiness penalizes gaps and unreviewed conformance", () => {
    const ready = computeStandardReadiness(
      ["closed_ready", "reviewed_no_gap"],
      {
        standardNumber: "1.1",
        pin: {
          contentPackId: "eqa-foundations",
          version: "1.0.0",
          contentHash: "abc",
        },
        conforms: 3,
        doesNotConform: 0,
        notApplicable: 0,
        unreviewed: 0,
        totalItems: 3,
      },
    );
    expect(ready.level).toBe("green");
    expect(ready.score).toBeGreaterThanOrEqual(75);

    const gap = computeStandardReadiness(
      ["gap_confirmed", "remediation_in_progress"],
      {
        standardNumber: "1.2",
        pin: {
          contentPackId: "eqa-foundations",
          version: "1.0.0",
          contentHash: "abc",
        },
        conforms: 1,
        doesNotConform: 1,
        notApplicable: 0,
        unreviewed: 1,
        totalItems: 3,
      },
    );
    expect(gap.level).toBe("red");
    expect(gap.score).toBeLessThanOrEqual(40);
  });

  it("buildDashboardView includes status breakdown for operational roles only", () => {
    const detail = buildDashboardView(inputEn);
    const summary = buildDashboardView(inputBoard);

    const detailCell = detail.heatMap[0]?.principles[0]?.standards[0];
    const summaryCell = summary.heatMap[0]?.principles[0]?.standards[0];

    expect(detail.isSummaryView).toBe(false);
    expect(summary.isSummaryView).toBe(true);
    expect(detailCell?.statusBreakdown).toBeDefined();
    expect(summaryCell?.statusBreakdown).toBeUndefined();
  });

  it("board summary omits low-priority not-started action", () => {
    const board = buildDashboardView(inputBoard);
    const cae = buildDashboardView(inputEn);

    expect(board.pendingActions.some((a) => a.id === "not-started")).toBe(
      false,
    );
    expect(cae.pendingActions.some((a) => a.id === "not-started")).toBe(false);
    expect(cae.pendingActions.some((a) => a.id === "draft-findings")).toBe(
      true,
    );
  });

  it("pending actions surface review, evidence, and working-paper gaps", () => {
    const view = buildDashboardView(inputEn);
    const ids = view.pendingActions.map((a) => a.id);
    expect(ids).toContain("findings-review");
    expect(ids).toContain("gaps-remediation");
    expect(ids).toContain("wp-unreviewed");
    expect(ids).toContain("draft-findings");
  });

  it("uxStatusLabel returns plain-language bilingual labels", () => {
    expect(uxStatusLabel("under_human_review", "en")).toBe(
      "Awaiting your review",
    );
    expect(uxStatusLabel("closed_ready", "ar")).toBe("جاهز");
    expect(uxStatusLabel("gap_confirmed", "en")).toContain("remediated");
  });

  it("isSummaryView is true only for board", () => {
    expect(isSummaryView("board")).toBe(true);
    expect(isSummaryView("cae")).toBe(false);
    expect(isSummaryView("audit_staff")).toBe(false);
  });

  it("computeOverallReadiness reflects mixed heat-map cells", () => {
    const cells: HeatMapCell[] = [
      {
        standardNumber: "1.1",
        standardTitle: "A",
        domainNumber: "I",
        domainTitle: "D",
        principleNumber: "1",
        principleTitle: "P",
        phase: "complete",
        readinessScore: 90,
        readinessLevel: "green",
        dominantStatus: "closed_ready",
        questionCount: 2,
      },
      {
        standardNumber: "1.2",
        standardTitle: "B",
        domainNumber: "I",
        domainTitle: "D",
        principleNumber: "1",
        principleTitle: "P",
        phase: "in_progress",
        readinessScore: 25,
        readinessLevel: "red",
        dominantStatus: "gap_confirmed",
        questionCount: 2,
      },
    ];
    const overall = computeOverallReadiness(cells, "en");
    expect(overall.level).toBe("red");
    expect(overall.score).toBe(58);
  });

  it("defaults missing question statuses to not_assessed", () => {
    const partial = new Map(inputEn.statusesByQuestion);
    partial.delete("Q-2-1-2");
    const progress = computeAssessmentProgress(inputEn.questionnaire, partial);
    expect(progress.startedCount).toBe(3);
  });
});
