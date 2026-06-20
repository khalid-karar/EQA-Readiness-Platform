import { describe, expect, it } from "vitest";
import { buildEvidencePackManifest } from "./evidence-pack";
import { computeMockEqaSimulation } from "./mock-eqa-scoring";
import { createSyntheticEvidencePackInput } from "./synthetic-evidence-pack";
import { createSyntheticMockEqaInput } from "./synthetic-mock-eqa";
import {
  createSeeraDemoConformanceByStandard,
  createSeeraDemoFinalConclusions,
  createSeeraDemoRemediationItems,
  createSeeraDemoStatusesByQuestion,
  SEERA_DEMO_QUESTIONS,
  SEERA_DEMO_RETEST_FAIL_NOTE,
  SEERA_DEMO_STANDARDS,
} from "./synthetic-seera-demo";

describe("synthetic Seera demo fixture (rule 5 — synthetic only)", () => {
  it("covers multiple principles with confirmed gaps and pending review", () => {
    const statuses = createSeeraDemoStatusesByQuestion();

    expect(statuses.get(SEERA_DEMO_QUESTIONS.OBJECTIVITY_THREATS)).toBe(
      "gap_confirmed",
    );
    expect(statuses.get(SEERA_DEMO_QUESTIONS.COI_DECLARATIONS)).toBe(
      "under_human_review",
    );
    expect(statuses.get(SEERA_DEMO_QUESTIONS.FUNCTIONAL_REPORTING)).toBe(
      "evidence_submitted",
    );
    expect(statuses.get(SEERA_DEMO_QUESTIONS.BUDGET_INDEPENDENCE)).toBe(
      "not_applicable",
    );
  });

  it("records a retest-loop failure note on the closed remediation item", () => {
    const closed = createSeeraDemoRemediationItems("en").find(
      (item) => item.questionId === SEERA_DEMO_QUESTIONS.ETHICS_CHARTER,
    );
    expect(closed?.closedAt).not.toBeNull();
    expect(closed?.retestNote).toBe(SEERA_DEMO_RETEST_FAIL_NOTE);
  });

  it("leaves working-paper checklist items unreviewed across standards", () => {
    const conformance = createSeeraDemoConformanceByStandard();
    expect(conformance.get(SEERA_DEMO_STANDARDS.ETHICS)?.unreviewed).toBe(2);
    expect(conformance.get(SEERA_DEMO_STANDARDS.ETHICS)?.conforms).toBe(1);
    expect(conformance.get(SEERA_DEMO_STANDARDS.OBJECTIVITY)?.unreviewed).toBe(
      2,
    );
    expect(
      conformance.get(SEERA_DEMO_STANDARDS.ORG_INDEPENDENCE)?.unreviewed,
    ).toBe(3);
  });

  it("assembles an evidence pack with gap findings and cross-principle coverage", () => {
    const manifest = buildEvidencePackManifest(
      createSyntheticEvidencePackInput("en"),
    );
    const standardNumbers = manifest.standards.map((s) => s.standardNumber);

    expect(standardNumbers).toContain(SEERA_DEMO_STANDARDS.ETHICS);
    expect(standardNumbers).toContain(SEERA_DEMO_STANDARDS.OBJECTIVITY);
    expect(standardNumbers).toContain(SEERA_DEMO_STANDARDS.ORG_INDEPENDENCE);

    const gapQuestion = manifest.standards
      .flatMap((s) => s.questions)
      .find((q) => q.questionId === SEERA_DEMO_QUESTIONS.OBJECTIVITY_THREATS);
    expect(gapQuestion?.status).toBe("gap_confirmed");
    expect(gapQuestion?.gapFinding).toBe(
      createSeeraDemoFinalConclusions()[0]?.conclusion,
    );
  });

  it("surfaces wp_unreviewed driving gaps in mock-EQA simulation", () => {
    const simulation = computeMockEqaSimulation(
      createSyntheticMockEqaInput("en"),
    );
    const orgStandard = simulation.domains[0]?.standards.find(
      (s) => s.standardNumber === SEERA_DEMO_STANDARDS.ORG_INDEPENDENCE,
    );
    expect(
      orgStandard?.drivingGaps.some((gap) => gap.source === "wp_unreviewed"),
    ).toBe(true);
  });
});
