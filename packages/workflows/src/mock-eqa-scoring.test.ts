import { describe, expect, it } from "vitest";
import {
  assertFormalAssessmentResult,
  assertReadinessSimulation,
} from "./mock-eqa-assessment-result";
import {
  buildMockEqaSimulationView,
  computeMockEqaSimulation,
  MOCK_EQA_DISCLAIMER,
  READINESS_SIMULATION_KIND,
} from "./mock-eqa-scoring";
import { computeStandardReadiness } from "./readiness-dashboard";
import { createSyntheticMockEqaInput } from "./synthetic-mock-eqa";

describe("mock-EQA readiness simulation (Step 15)", () => {
  const input = createSyntheticMockEqaInput("en");

  it("computes per-standard ratings from statuses, findings, and WP conformance", () => {
    const result = computeMockEqaSimulation(input);
    const std11 = result.domains[0]?.standards.find(
      (s) => s.standardNumber === "1.1",
    );
    const std12 = result.domains[0]?.standards.find(
      (s) => s.standardNumber === "1.2",
    );
    const std21 = result.domains[0]?.standards.find(
      (s) => s.standardNumber === "2.1",
    );

    expect(std11?.rating.level).toBe("amber");
    expect(std11?.rating.score).toBeLessThanOrEqual(75);
    expect(
      std11?.drivingGaps.some((g) => g.source === "wp_unreviewed"),
    ).toBe(true);

    expect(std12?.rating.level).toBe("red");
    expect(std12?.rating.score).toBeLessThanOrEqual(40);
    expect(
      std12?.drivingGaps.some((g) => g.source === "confirmed_gap_status"),
    ).toBe(true);
    expect(
      std12?.drivingGaps.some((g) => g.source === "human_reviewed_finding"),
    ).toBe(true);
    expect(std12?.drivingGaps.some((g) => g.source === "wp_unreviewed")).toBe(
      true,
    );

    expect(std21?.rating.level).toBe("red");
    expect(
      std21?.drivingGaps.some(
        (g) => g.source === "wp_unreviewed" || g.source === "not_started",
      ),
    ).toBe(true);
    expect(std21?.drivingGaps.some((g) => g.source === "wp_unreviewed")).toBe(
      true,
    );
  });

  it("aggregates per-domain and overall ratings correctly", () => {
    const result = computeMockEqaSimulation(input);
    const domain = result.domains[0];

    expect(domain?.standards).toHaveLength(3);
    const expectedDomainScore = Math.round(
      (domain!.standards[0]!.rating.score +
        domain!.standards[1]!.rating.score +
        domain!.standards[2]!.rating.score) /
        3,
    );
    expect(domain?.rating.score).toBe(expectedDomainScore);
    expect(domain?.rating.level).toBe("red");

    const expectedOverall = Math.round(
      domain!.standards.reduce((sum, s) => sum + s.rating.score, 0) / 3,
    );
    expect(result.overall.score).toBe(expectedOverall);
    expect(result.overall.level).toBe("red");
  });

  it("matches computeStandardReadiness for each standard in isolation", () => {
    const result = computeMockEqaSimulation(input);
    for (const std of result.domains[0]?.standards ?? []) {
      const statuses = input.questionnaire.domains
        .flatMap((d) => d.principles)
        .flatMap((p) => p.standards)
        .find((s) => s.number === std.standardNumber)
        ?.questions.map(
          (q) => input.statusesByQuestion.get(q.questionId) ?? "not_assessed",
        );
      const conformance = input.conformanceByStandard?.get(std.standardNumber);
      const expected = computeStandardReadiness(statuses ?? [], conformance);
      expect(std.rating.score).toBe(expected.score);
      expect(std.rating.level).toBe(expected.level);
    }
  });

  it("assigns a unique simulation id per run when not provided", () => {
    const { simulationId: _ignored, ...withoutId } = input;
    const first = computeMockEqaSimulation(withoutId);
    const second = computeMockEqaSimulation(withoutId);

    expect(first.simulationId).toMatch(/^sim-/);
    expect(first.simulationId).not.toBe(second.simulationId);
  });

  it("types the result as readiness_simulation with disclaimer always present", () => {
    const result = computeMockEqaSimulation(input);
    expect(result.kind).toBe(READINESS_SIMULATION_KIND);
    expect(result.disclaimer).toEqual(MOCK_EQA_DISCLAIMER);
    assertReadinessSimulation(result);
    expect(() => assertFormalAssessmentResult(result)).toThrow(
      /readiness simulation as a formal assessment/i,
    );
  });

  it("includes bilingual disclaimer text in output", () => {
    const result = computeMockEqaSimulation(input);
    expect(result.disclaimer.en).toMatch(/READINESS SIMULATION ONLY/i);
    expect(result.disclaimer.en).toMatch(/does NOT replace/i);
    expect(result.disclaimer.ar).toMatch(/محاكاة الجاهزية فقط/);
    expect(result.disclaimer.ar).toMatch(/لا تحل محل/);
  });

  it("buildMockEqaSimulationView allows run for operational roles only", () => {
    const cae = buildMockEqaSimulationView({
      ...input,
      role: "cae",
    });
    const board = buildMockEqaSimulationView({
      ...input,
      role: "board",
    });

    expect(cae.canRunSimulation).toBe(true);
    expect(cae.isSummaryView).toBe(false);
    expect(board.canRunSimulation).toBe(false);
    expect(board.isSummaryView).toBe(true);
  });

  it("localizes driving gap summaries in Arabic", () => {
    const arInput = createSyntheticMockEqaInput("ar");
    const result = computeMockEqaSimulation(arInput);
    const std12 = result.domains[0]?.standards.find(
      (s) => s.standardNumber === "1.2",
    );
    expect(
      std12?.drivingGaps.some((g) => g.summary.includes("فجوة مؤكدة")),
    ).toBe(true);
    expect(
      std12?.drivingGaps.some((g) => g.summary.includes("المراجعة البشرية")),
    ).toBe(true);
  });
});
