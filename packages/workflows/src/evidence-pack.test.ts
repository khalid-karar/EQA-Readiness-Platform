import { afterAll, describe, expect, it } from "vitest";
import {
  buildEvidencePackManifest,
  EVIDENCE_PACK_CONFIDENTIALITY,
  EVIDENCE_PACK_KIND,
  isEvidencePackManifest,
} from "./evidence-pack";
import {
  pdfContainsText,
  pdfContainsUnicodeSubstring,
  renderEvidencePackPdf,
  verifyArabicPdfPackCompliance,
  verifyPdfPackCompliance,
} from "./evidence-pack-pdf";
import { closeEvidencePackBrowser } from "./evidence-pack-pdf-chromium";
import { MOCK_EQA_DISCLAIMER } from "./mock-eqa-scoring";
import { createSyntheticEvidencePackInput } from "./synthetic-evidence-pack";

describe("EQA evidence pack export (Step 16)", () => {
  const inputEn = createSyntheticEvidencePackInput("en");
  const manifestEn = buildEvidencePackManifest(inputEn);

  afterAll(async () => {
    await closeEvidencePackBrowser();
  });

  it("assembles a complete standard-by-standard pack from underlying data", () => {
    expect(manifestEn.kind).toBe(EVIDENCE_PACK_KIND);
    expect(manifestEn.standards).toHaveLength(3);

    const std11 = manifestEn.standards.find((s) => s.standardNumber === "1.1");
    const std12 = manifestEn.standards.find((s) => s.standardNumber === "1.2");
    const std21 = manifestEn.standards.find((s) => s.standardNumber === "2.1");

    expect(std11?.evidenceIndex).toHaveLength(1);
    expect(std11?.evidenceIndex[0]?.fileName).toBe(
      "ethics-charter-acknowledgements.pdf",
    );
    expect(std12?.gapStatusSummary).toMatch(/confirmed|remediation|1/);
    expect(std12?.remediationSummary).toBeDefined();
    expect(std12?.evidenceIndex).toHaveLength(2);
    expect(
      std12?.questions.find((q) => q.questionId === "Q-1-2-1")?.gapFinding,
    ).toBeDefined();

    const pending = std12?.questions.find((q) => q.questionId === "Q-1-2-2");
    expect(pending?.reviewerNote).toMatch(/CAE review/i);

    expect(std21?.evidenceIndex).toHaveLength(2);
    expect(
      std21?.evidenceIndex.some(
        (e) => e.fileName === "budget-independence-memo-draft.docx",
      ),
    ).toBe(true);
    expect(manifestEn.readinessSummary.score).toBeGreaterThan(0);
    expect(isEvidencePackManifest(manifestEn)).toBe(true);
  });

  it("excludes raw evidence files by default — references and metadata only", () => {
    expect(manifestEn.includeRawEvidence).toBe(false);
    expect(manifestEn.rawEvidenceExcluded).toBe(true);
    expect(manifestEn.bundledFileCount).toBe(0);

    for (const std of manifestEn.standards) {
      for (const entry of std.evidenceIndex) {
        expect(entry).toHaveProperty("evidenceId");
        expect(entry).toHaveProperty("fileName");
        expect(entry).not.toHaveProperty("rawBytes");
        expect(entry).not.toHaveProperty("objectKey");
      }
    }
  });

  it("includes confidentiality footer and assessor-independence disclaimer in manifest", () => {
    expect(manifestEn.confidentialityFooter).toEqual(
      EVIDENCE_PACK_CONFIDENTIALITY,
    );
    expect(manifestEn.assessorDisclaimer).toEqual(MOCK_EQA_DISCLAIMER);
    expect(manifestEn.assessorDisclaimer.en).toMatch(/does NOT replace/i);
    expect(manifestEn.confidentialityFooter.en).toMatch(/CONFIDENTIAL/i);
  });

  it("renders English PDF with confidentiality footer and disclaimer on every page", async () => {
    const pdf = await renderEvidencePackPdf(manifestEn);
    expect(pdf.length).toBeGreaterThan(1000);
    expect(await verifyPdfPackCompliance(pdf)).toBe(true);
    expect(pdfContainsText(pdf, "[non-Latin text — see manifest]")).toBe(false);
    expect(pdfContainsUnicodeSubstring(pdf, "محاكاة")).toBe(false);
  }, 60_000);

  it("localizes pack content for Arabic locale", () => {
    const manifestAr = buildEvidencePackManifest(
      createSyntheticEvidencePackInput("ar"),
    );
    const std12 = manifestAr.standards.find((s) => s.standardNumber === "1.2");
    expect(std12?.questions[0]?.statusLabel).toMatch(/فجوة|معالجة|مراجعة/);
    expect(manifestAr.assessorDisclaimer.ar).toMatch(/محاكاة الجاهزية فقط/);
  });

  it("renders Arabic PDF with compliance markers and Arabic body text", async () => {
    const manifestAr = buildEvidencePackManifest(
      createSyntheticEvidencePackInput("ar"),
    );
    const pdf = await renderEvidencePackPdf(manifestAr);

    expect(pdf.length).toBeGreaterThan(10_000);
    expect(await verifyArabicPdfPackCompliance(pdf)).toBe(true);
    expect(pdfContainsText(pdf, "[non-Latin text — see manifest]")).toBe(false);
    expect(pdfContainsText(pdf, "READINESS SIMULATION ONLY")).toBe(false);

    expect(pdfContainsUnicodeSubstring(pdf, "محاكاة")).toBe(true);
    expect(pdfContainsUnicodeSubstring(pdf, "سري")).toBe(true);
    expect(pdfContainsUnicodeSubstring(pdf, "EQA")).toBe(true);
  }, 60_000);
});
