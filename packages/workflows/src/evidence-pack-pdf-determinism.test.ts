import { describe, expect, it } from "vitest";
import type { Locale } from "@eqa/content";
import { buildEvidencePackManifest } from "./evidence-pack";
import { PINNED_CHROMIUM_REVISION } from "./evidence-pack-pdf-chromium";
import {
  checkEvidencePackPdfDeterminism,
  formatPdfDeterminismMismatch,
} from "./evidence-pack-pdf-determinism";
import { createSyntheticEvidencePackInput } from "./synthetic-evidence-pack";
import { createMixedScriptTortureEvidencePackInput } from "./synthetic-mixed-script-torture";

/**
 * CI determinism gate — run via `pnpm test:pdf-determinism` with
 * EQA_PDF_REUSE_BROWSER=false so each render uses a fresh Chromium launch.
 * Skipped in the default `pnpm test` run (browser reuse enabled for speed).
 */
describe.runIf(process.env.EQA_PDF_REUSE_BROWSER === "false")(
  "evidence pack PDF determinism (CI gate)",
  () => {
    it("runs with independent Chromium launches (not shared browser reuse)", () => {
      expect(process.env.EQA_PDF_REUSE_BROWSER).toBe("false");
      expect(PINNED_CHROMIUM_REVISION).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
    });

    describe.each([
      { suite: "seera-demo", locale: "en" as const, label: "Seera demo (EN)" },
      { suite: "seera-demo", locale: "ar" as const, label: "Seera demo (AR)" },
      {
        suite: "mixed-script-torture",
        locale: "ar" as const,
        label: "Mixed-script torture (AR)",
      },
    ])("$label", ({ suite, locale, label }) => {
      const manifest = buildEvidencePackManifest(
        suite === "mixed-script-torture"
          ? createMixedScriptTortureEvidencePackInput(locale as Locale)
          : createSyntheticEvidencePackInput(locale),
      );

      it("produces byte-identical PDFs on two renders from the same input", async () => {
        const mismatch = await checkEvidencePackPdfDeterminism(manifest, label);
        expect(
          mismatch,
          mismatch ? formatPdfDeterminismMismatch(mismatch) : undefined,
        ).toBeUndefined();
      }, 120_000);
    });
  },
);
