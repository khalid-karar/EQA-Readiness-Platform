import { describe, expect, it } from "vitest";
import { buildDashboardPresentation } from "./present-dashboard";

describe("present-journey-map", () => {
  it("binds seven checkpoints to real readiness metrics", () => {
    const presentation = buildDashboardPresentation("en", "cae");
    const { journeyMap, view } = presentation;

    expect(journeyMap.checkpoints).toHaveLength(7);
    expect(journeyMap.pathFillPercent).toBe(view.overallReadiness.score);
    expect(journeyMap.finishPercent).toBe(view.overallReadiness.score);

    const scope = journeyMap.checkpoints.find((c) => c.id === "scope");
    expect(scope?.href).toBe("/assessment");

    const evidence = journeyMap.checkpoints.find((c) => c.id === "evidence");
    expect(evidence?.href).toBe("/evidence");

    const methodology = journeyMap.checkpoints.find((c) => c.id === "methodology");
    expect(methodology?.href).toBe("/working-papers");
    expect(scope?.percent).toBe(
      Math.round(
        (view.progress.startedCount / view.progress.totalStandards) * 100,
      ),
    );
    expect(scope?.metricEn).toContain(
      `${view.progress.startedCount}/${view.progress.totalStandards}`,
    );

    const remediation = journeyMap.checkpoints.find(
      (c) => c.id === "remediation",
    );
    expect(remediation?.href).toBe("/remediation");

    const mockEqa = journeyMap.checkpoints.find((c) => c.id === "mock-eqa");
    expect(mockEqa?.href).toBe("/mock-eqa");
    expect(mockEqa?.state).toBe("not-started");
    expect(mockEqa?.percent).toBe(0);

    const pack = journeyMap.checkpoints.find((c) => c.id === "evidence-pack");
    expect(pack?.href).toBe("/evidence-pack");
  });

  it("provides bilingual labels for every checkpoint", () => {
    const presentation = buildDashboardPresentation("ar", "cae");
    for (const checkpoint of presentation.journeyMap.checkpoints) {
      expect(checkpoint.labelEn.length).toBeGreaterThan(0);
      expect(checkpoint.labelAr.length).toBeGreaterThan(0);
      expect(checkpoint.metricAr.length).toBeGreaterThan(0);
    }
  });

  it("shows a realistic mix of checkpoint states for the Seera demo story", () => {
    const { journeyMap } = buildDashboardPresentation("en", "cae");
    const states = journeyMap.checkpoints.map((c) => c.state);

    expect(states.filter((s) => s === "cleared").length).toBeGreaterThanOrEqual(2);
    expect(states).toContain("in-progress");
    expect(states).toContain("blocked");
    expect(states).toContain("not-started");

    const scope = journeyMap.checkpoints.find((c) => c.id === "scope");
    const evidence = journeyMap.checkpoints.find((c) => c.id === "evidence");
    const gaps = journeyMap.checkpoints.find((c) => c.id === "gaps-identified");
    const mockEqa = journeyMap.checkpoints.find((c) => c.id === "mock-eqa");
    const pack = journeyMap.checkpoints.find((c) => c.id === "evidence-pack");

    expect(scope?.state).toBe("cleared");
    expect(evidence?.state).toBe("cleared");
    expect(gaps?.state).toBe("blocked");
    expect(mockEqa?.state).toBe("not-started");
    expect(pack?.state).toBe("not-started");
  });
});
