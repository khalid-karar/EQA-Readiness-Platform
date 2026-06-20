import { describe, expect, it } from "vitest";
import {
  buildMockEqaPresentation,
  mockEqaOutputIncludesDisclaimer,
} from "./present-mock-eqa";

describe("mock-EQA presentation output", () => {
  it("includes the prominent disclaimer in EN and AR output", () => {
    const en = buildMockEqaPresentation("en", "cae");
    const ar = buildMockEqaPresentation("ar", "board");

    expect(mockEqaOutputIncludesDisclaimer(en)).toBe(true);
    expect(mockEqaOutputIncludesDisclaimer(ar)).toBe(true);
    expect(en.disclaimerText).toMatch(/READINESS SIMULATION ONLY/i);
    expect(en.disclaimerText).toMatch(/does NOT replace/i);
    expect(ar.disclaimerText).toMatch(/محاكاة الجاهزية فقط/);
    expect(ar.disclaimerText).toMatch(/لا تحل محل/);
  });

  it("surfaces per-domain and per-standard simulated ratings with driving gaps", () => {
    const presentation = buildMockEqaPresentation("en", "cae");
    expect(presentation.domains.length).toBeGreaterThan(0);
    expect(presentation.standardRows.length).toBeGreaterThan(0);
    expect(presentation.overallLevel).toBe("red");
    const std12 = presentation.standardRows.find(
      (s) => s.standardNumber === "1.2",
    );
    expect(std12?.drivingGaps.length).toBeGreaterThan(0);
    expect(std12?.ratingLevel).toBe("red");
  });

  it("marks Board as read-only for running simulations", () => {
    const board = buildMockEqaPresentation("en", "board");
    expect(board.view.canRunSimulation).toBe(false);
    expect(board.view.isSummaryView).toBe(true);
  });
});
