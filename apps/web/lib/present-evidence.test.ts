import { describe, expect, it } from "vitest";
import { buildEvidencePresentation } from "./present-evidence";

describe("present-evidence", () => {
  it("builds evidence rows from the Seera demo fixture", () => {
    const presentation = buildEvidencePresentation("en", "cae");

    expect(presentation.items.length).toBe(5);
    expect(presentation.clearedCount).toBe(3);
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
