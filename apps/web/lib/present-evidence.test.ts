import { describe, expect, it } from "vitest";
import {
  parseEvidenceLinks,
  standardNumbersFromLinks,
} from "./evidence-links";
import { buildEvidencePresentation } from "./present-evidence";

describe("evidence-links", () => {
  it("groups question ids under preceding standard numbers", () => {
    const groups = parseEvidenceLinks([
      "1.1",
      "Q-1-1-1",
      "Q-1-1-2",
      "1.2",
      "Q-1-2-3",
    ]);
    expect(groups).toEqual([
      { standardNumber: "1.1", questionIds: ["Q-1-1-1", "Q-1-1-2"] },
      { standardNumber: "1.2", questionIds: ["Q-1-2-3"] },
    ]);
  });

  it("lists distinct standard numbers in encounter order", () => {
    expect(standardNumbersFromLinks(["1.2", "Q-1", "1.1", "1.2"])).toEqual([
      "1.2",
      "1.1",
    ]);
  });
});

describe("present-evidence", () => {
  it("builds evidence rows from the Seera demo fixture", () => {
    const presentation = buildEvidencePresentation("en", "cae");

    expect(presentation.items.length).toBe(6);
    expect(presentation.clearedCount).toBe(4);
    expect(presentation.quarantinedCount).toBe(2);

    const quarantined = presentation.items.find(
      (i) => i.evidenceId === "ev-coi-spreadsheet",
    );
    expect(quarantined?.scanStatus).toBe("quarantined");
    expect(quarantined?.downloadable).toBe(false);
    expect(quarantined?.scanLabelEn).toContain("Quarantined");

    const cleared = presentation.items.find(
      (i) => i.evidenceId === "ev-ethics-charter",
    );
    expect(cleared?.scanStatus).toBe("clean");
    expect(cleared?.downloadable).toBe(true);
    expect(cleared?.standardNumber).toBe("1.1");
    expect(cleared?.linkedStandards).toHaveLength(1);
  });

  it("marks cross-standard reuse from links array", () => {
    const presentation = buildEvidencePresentation("en", "cae");
    const reused = presentation.items.find(
      (i) => i.evidenceId === "ev-shared-coi-policy",
    );
    expect(reused?.reusedAcrossStandards).toBe(true);
    expect(reused?.linkedStandards.map((s) => s.standardNumber)).toEqual([
      "1.1",
      "1.2",
    ]);
  });

  it("localizes labels for Arabic", () => {
    const presentation = buildEvidencePresentation("ar", "cae");
    const item = presentation.items[0];
    expect(item).toBeDefined();
    expect(item!.typeLabelAr.length).toBeGreaterThan(0);
    expect(item!.scanLabelAr.length).toBeGreaterThan(0);
    expect(item!.evidenceRefAr).toContain("إصدار");
  });
});
