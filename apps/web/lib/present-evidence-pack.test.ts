import { describe, expect, it } from "vitest";
import {
  buildEvidencePackPresentation,
  packOutputIncludesDisclaimer,
} from "./present-evidence-pack";

describe("evidence pack presentation output", () => {
  it("includes confidentiality footer and assessor disclaimer in output", () => {
    const en = buildEvidencePackPresentation("en", "cae");
    const ar = buildEvidencePackPresentation("ar", "board");

    expect(packOutputIncludesDisclaimer(en)).toBe(true);
    expect(packOutputIncludesDisclaimer(ar)).toBe(true);
    expect(en.disclaimerText).toMatch(/does NOT replace/i);
    expect(en.confidentialityText).toMatch(/CONFIDENTIAL/i);
    expect(ar.confidentialityText).toMatch(/سري/);
    expect(ar.disclaimerText).toMatch(/محاكاة الجاهزية فقط/);
  });

  it("exposes zero bundled raw files and evidence references only", () => {
    const presentation = buildEvidencePackPresentation("en", "cae");
    expect(presentation.bundledFileCount).toBe(0);
    expect(presentation.evidenceReferenceCount).toBeGreaterThan(0);
    expect(presentation.standardCount).toBe(3);
  });

  it("marks Board as read-only for generation", () => {
    const board = buildEvidencePackPresentation("en", "board");
    expect(board.canGenerate).toBe(false);
    expect(board.isSummaryView).toBe(true);
    const cae = buildEvidencePackPresentation("en", "cae");
    expect(cae.canGenerate).toBe(true);
  });
});
