import { afterAll, describe, expect, it } from "vitest";
import { buildEvidencePackManifest } from "./evidence-pack";
import {
  closeEvidencePackBrowser,
  evidencePackPdfSha256,
  PINNED_CHROMIUM_REVISION,
} from "./evidence-pack-pdf-chromium";
import { renderEvidencePackPdf } from "./evidence-pack-pdf";
import {
  assertNoBareMachineTokensInHtml,
  buildEvidencePackHtml,
} from "./evidence-pack-html-template";
import {
  assertRegionsMatchVisualBaselines,
  readVisualBaselineManifest,
} from "./evidence-pack-visual-regression";
import { createMixedScriptTortureEvidencePackInput } from "./synthetic-mixed-script-torture";

describe("evidence pack mixed-script torture (Arabic bidi)", () => {
  const manifestAr = buildEvidencePackManifest(
    createMixedScriptTortureEvidencePackInput("ar"),
  );

  afterAll(async () => {
    await closeEvidencePackBrowser();
  });

  it("has no bare machine tokens outside .ltr-atom in torture HTML", () => {
    const html = buildEvidencePackHtml(manifestAr);
    expect(() => assertNoBareMachineTokensInHtml(html)).not.toThrow();
  });

  it("produces deterministic PDF bytes on repeated renders", async () => {
    const first = await renderEvidencePackPdf(manifestAr);
    const second = await renderEvidencePackPdf(manifestAr);
    expect(evidencePackPdfSha256(first)).toBe(evidencePackPdfSha256(second));
    expect(first).toEqual(second);
  }, 60_000);

  it.skip(// TODO(step-16): un-skip after torture baseline visually approved
  "matches committed region baselines (metadata + evidence rows, ≤0.5%)", async () => {
    const manifestMeta = readVisualBaselineManifest();
    expect(manifestMeta.chromiumRevision).toBe(PINNED_CHROMIUM_REVISION);

    const tortureEntry = manifestMeta.suites.find(
      (suite) => suite.id === "mixed-script-torture" && suite.locale === "ar",
    );
    expect(tortureEntry?.diffMode).toBe("region");
    expect(tortureEntry?.regions?.length).toBeGreaterThan(0);

    const pdf = await renderEvidencePackPdf(manifestAr);
    const result = await assertRegionsMatchVisualBaselines(
      pdf,
      "mixed-script-torture",
      "ar",
    );

    if (result.skipped) {
      console.warn(result.skipped);
      return;
    }
  }, 90_000);
});
