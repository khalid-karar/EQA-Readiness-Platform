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
    expect(mockEqa?.percent).toBeGreaterThan(0);

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
});
