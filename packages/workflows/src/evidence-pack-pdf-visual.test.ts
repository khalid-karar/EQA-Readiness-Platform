import { afterAll, describe, expect, it } from "vitest";
import { buildEvidencePackManifest } from "./evidence-pack";
import {
  closeEvidencePackBrowser,
  evidencePackPdfSha256,
  PINNED_CHROMIUM_REVISION,
} from "./evidence-pack-pdf-chromium";
import { renderEvidencePackPdf } from "./evidence-pack-pdf";
import { assertTemplateOffline } from "./evidence-pack-html-template";
import { createSyntheticEvidencePackInput } from "./synthetic-evidence-pack";
import {
  assertAllPagesMatchVisualBaselines,
  assertRegionsMatchVisualBaselines,
  readVisualBaselineManifest,
} from "./evidence-pack-visual-regression";

describe("evidence pack HTML template (offline)", () => {
  it("rejects external HTTP(S) URLs in the template", () => {
    expect(() =>
      assertTemplateOffline("https://fonts.googleapis.com/css"),
    ).toThrow(/must not reference external HTTP/i);
    expect(() =>
      assertTemplateOffline('<img src="http://cdn.example/x">'),
    ).toThrow(/must not reference external HTTP/i);
  });
});

describe.each([
  { locale: "en" as const, label: "English" },
  { locale: "ar" as const, label: "Arabic" },
])(
  "evidence pack PDF visual regression (Seera demo — $label)",
  ({ locale }) => {
    const manifest = buildEvidencePackManifest(
      createSyntheticEvidencePackInput(locale),
    );

    afterAll(async () => {
      await closeEvidencePackBrowser();
    });

    it("produces deterministic PDF bytes on repeated renders", async () => {
      const first = await renderEvidencePackPdf(manifest);
      const second = await renderEvidencePackPdf(manifest);
      expect(evidencePackPdfSha256(first)).toBe(evidencePackPdfSha256(second));
      expect(first).toEqual(second);
    }, 60_000);

    it(
      locale === "en"
        ? "matches committed page baselines (all pages, pdftoppm)"
        : "matches committed region baselines (metadata + evidence rows, ≤0.5%)",
      async () => {
        const manifestMeta = readVisualBaselineManifest();
        expect(manifestMeta.chromiumRevision).toBe(PINNED_CHROMIUM_REVISION);

        const pdf = await renderEvidencePackPdf(manifest);
        const result =
          locale === "en"
            ? await assertAllPagesMatchVisualBaselines(
                pdf,
                "seera-demo",
                locale,
              )
            : await assertRegionsMatchVisualBaselines(
                pdf,
                "seera-demo",
                locale,
              );

        if (result.skipped) {
          console.warn(result.skipped);
          return;
        }
      },
      90_000,
    );
  },
);

describe("evidence pack visual baseline manifest", () => {
  it("lists Seera demo EN and AR suites pinned to Chromium revision", () => {
    const manifest = readVisualBaselineManifest();
    expect(manifest.chromiumRevision).toBe(PINNED_CHROMIUM_REVISION);
    expect(manifest.approvalRequired).toBe(true);

    const en = manifest.suites.find(
      (suite) => suite.id === "seera-demo" && suite.locale === "en",
    );
    expect(en, "missing seera-demo en in manifest").toBeDefined();
    expect(en!.pages).toBeGreaterThan(0);
    expect(en!.diffMode).toBe("page");

    const ar = manifest.suites.find(
      (suite) => suite.id === "seera-demo" && suite.locale === "ar",
    );
    expect(ar, "missing seera-demo ar in manifest").toBeDefined();
    expect(ar!.pages).toBeGreaterThan(0);
    expect(ar!.diffMode).toBe("region");
    expect(ar!.regions?.length).toBeGreaterThan(0);
    expect(ar!.regions?.some((r) => r.id === "metadata-timestamp")).toBe(true);
    expect(ar!.regions?.some((r) => r.id.startsWith("evidence-index-"))).toBe(
      true,
    );
  });
});
