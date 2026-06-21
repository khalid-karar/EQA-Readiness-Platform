import { describe, expect, it } from "vitest";
import { buildAssessmentPresentation } from "./present-assessment";

describe("present-assessment", () => {
  it("builds standard rows from the Seera questionnaire fixture", () => {
    const presentation = buildAssessmentPresentation("en", "cae");

    expect(presentation.standards.length).toBeGreaterThanOrEqual(3);
    expect(presentation.startedCount).toBeGreaterThan(0);
    expect(presentation.totalStandards).toBe(presentation.standards.length);

    const objectivity = presentation.standards.find(
      (s) => s.standardNumber === "1.2",
    );
    expect(objectivity).toBeDefined();
    expect(objectivity!.questions.length).toBeGreaterThan(0);
    expect(objectivity!.pinLabelEn).toContain("eqa-foundations");

    const withResponse = objectivity!.questions.find(
      (q) => q.questionId === "Q-1-2-2",
    );
    expect(withResponse?.answer).toBe("Partial");
    expect(withResponse?.history.length).toBeGreaterThan(0);
  });

  it("localizes labels for Arabic", () => {
    const presentation = buildAssessmentPresentation("ar", "cae");
    const standard = presentation.standards[0];
    expect(standard).toBeDefined();
    expect(standard!.statusLabelAr.length).toBeGreaterThan(0);
    expect(standard!.pinLabelAr).toContain("eqa-foundations");
  });
});
