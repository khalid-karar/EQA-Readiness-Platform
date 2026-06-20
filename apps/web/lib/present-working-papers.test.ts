import { describe, expect, it } from "vitest";
import { buildWorkingPapersPresentation } from "./present-working-papers";

describe("present-working-papers", () => {
  it("builds checklist rows from the Seera working-paper fixture", () => {
    const presentation = buildWorkingPapersPresentation("en", "cae");

    expect(presentation.items.length).toBe(9);
    expect(presentation.unreviewedCount).toBe(7);
    expect(presentation.conformantCount).toBe(2);
    expect(presentation.reviewedCount).toBe(2);

    const unreviewed = presentation.items.find(
      (i) => i.itemId === "C-2-1-1",
    );
    expect(unreviewed?.conformance).toBe("unreviewed");
    expect(unreviewed?.itemTextEn).toContain("charter");

    const conformant = presentation.items.find(
      (i) => i.itemId === "C-1-1-1",
    );
    expect(conformant?.conformance).toBe("conformant");
    expect(conformant?.standardNumber).toBe("1.1");
  });

  it("localizes labels for Arabic", () => {
    const presentation = buildWorkingPapersPresentation("ar", "cae");
    const item = presentation.items[0];
    expect(item).toBeDefined();
    expect(item!.itemTextAr.length).toBeGreaterThan(0);
    expect(item!.conformanceLabelAr.length).toBeGreaterThan(0);
    expect(presentation.engagementTitleAr.length).toBeGreaterThan(0);
  });
});
