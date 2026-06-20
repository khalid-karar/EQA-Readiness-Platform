/**
 * Regenerates all committed evidence-pack visual regression baseline PNGs
 * (Seera demo EN+AR, mixed-script torture AR) and updates manifest.json.
 *
 * English suites: whole-page baselines at ≤2%.
 * Arabic suites: region crops (metadata/timestamp band + evidence-index rows) at ≤0.5%.
 *
 * Requires poppler-utils (`pdftoppm` on PATH). Uses the same browser reuse
 * flag as vitest so raster output matches CI.
 *
 * **Requires human visual approval before committing updated PNGs.**
 *
 * Usage: pnpm generate:evidence-pack-visual-baselines
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import type { Locale } from "@eqa/content";
import {
  buildEvidencePackManifest,
  createSyntheticEvidencePackInput,
  renderEvidencePackPdf,
} from "@eqa/workflows";
import { closeEvidencePackBrowser } from "../packages/workflows/src/evidence-pack-pdf-chromium";
import {
  countPdfPages,
  isPopplerAvailable,
  rasterizePdfAllPagesWithPoppler,
} from "../packages/workflows/src/evidence-pack-pdf-rasterize";
import { PINNED_CHROMIUM_REVISION } from "../packages/workflows/src/evidence-pack-chromium-pin";
import { measureVisualRegionsFromManifest } from "../packages/workflows/src/evidence-pack-visual-region-measure";
import {
  defaultVisualDiffMode,
  VISUAL_BASELINES_ROOT,
  visualBaselinePagePath,
  visualBaselineRegionPath,
  visualBaselineSuiteDir,
  writeRegionBaselines,
  writeVisualBaselineManifest,
  writeVisualBaselineReadme,
  type VisualBaselineManifest,
  type VisualBaselineSuiteEntry,
  type VisualDiffMode,
} from "../packages/workflows/src/evidence-pack-visual-regression";
import { createMixedScriptTortureEvidencePackInput } from "../packages/workflows/src/synthetic-mixed-script-torture";

interface SuiteSpec {
  readonly id: string;
  readonly locale: Locale;
  readonly label: string;
  readonly input: () => ReturnType<typeof createSyntheticEvidencePackInput>;
}

const SUITES: readonly SuiteSpec[] = [
  {
    id: "seera-demo",
    locale: "en",
    label: "Seera demo",
    input: () => createSyntheticEvidencePackInput("en"),
  },
  {
    id: "seera-demo",
    locale: "ar",
    label: "Seera demo",
    input: () => createSyntheticEvidencePackInput("ar"),
  },
  {
    id: "mixed-script-torture",
    locale: "ar",
    label: "Mixed-script torture",
    input: () => createMixedScriptTortureEvidencePackInput("ar"),
  },
];

async function generateSuiteBaselines(
  spec: SuiteSpec,
): Promise<VisualBaselineSuiteEntry> {
  const manifest = buildEvidencePackManifest(spec.input());
  const pdf = await renderEvidencePackPdf(manifest);
  const pageCount = await countPdfPages(pdf);

  const rasterized = rasterizePdfAllPagesWithPoppler(pdf);
  if (!rasterized || rasterized.length === 0) {
    throw new Error(
      "pdftoppm failed — install poppler-utils and ensure pdftoppm is on PATH",
    );
  }
  if (rasterized.length !== pageCount) {
    throw new Error(
      `Rasterized ${rasterized.length} page(s) but PDF has ${pageCount} for ${spec.id} (${spec.locale})`,
    );
  }

  const diffMode: VisualDiffMode = defaultVisualDiffMode(spec.locale);
  mkdirSync(visualBaselineSuiteDir(spec.id, spec.locale), { recursive: true });
  writeVisualBaselineReadme(spec.id, spec.locale, spec.label, diffMode);

  for (let page = 1; page <= rasterized.length; page += 1) {
    const png = rasterized[page - 1];
    if (!png) {
      throw new Error(`Missing raster output for page ${page}`);
    }
    const outPath = visualBaselinePagePath(spec.id, spec.locale, page);
    writeFileSync(outPath, Buffer.from(png));
    console.log(`Wrote ${outPath} (${png.length} bytes)`);
  }

  if (diffMode === "region") {
    const firstPage = rasterized[0];
    if (!firstPage) {
      throw new Error(
        `Missing raster output for page 1 (${spec.id} ${spec.locale})`,
      );
    }
    const pageHeightPx = PNG.sync.read(Buffer.from(firstPage)).height;
    const regions = await measureVisualRegionsFromManifest(
      manifest,
      pageHeightPx,
    );
    if (regions.length === 0) {
      throw new Error(
        `No [data-visual-region] boxes measured for ${spec.id} (${spec.locale})`,
      );
    }

    writeRegionBaselines(spec.id, spec.locale, rasterized, regions);
    for (const region of regions) {
      const regionPath = visualBaselineRegionPath(
        spec.id,
        spec.locale,
        region.id,
      );
      console.log(
        `Wrote ${regionPath} (page ${region.page}, ${region.width}x${region.height})`,
      );
    }

    return {
      id: spec.id,
      locale: spec.locale,
      pages: rasterized.length,
      diffMode,
      regions,
    };
  }

  return {
    id: spec.id,
    locale: spec.locale,
    pages: rasterized.length,
    diffMode,
  };
}

async function main(): Promise<void> {
  if (!isPopplerAvailable()) {
    console.error(
      "pdftoppm (poppler-utils) is required to generate multi-page baselines.",
    );
    process.exit(1);
  }

  process.env.EQA_PDF_REUSE_BROWSER = "true";
  mkdirSync(VISUAL_BASELINES_ROOT, { recursive: true });

  const suiteEntries: VisualBaselineSuiteEntry[] = [];
  for (const spec of SUITES) {
    suiteEntries.push(await generateSuiteBaselines(spec));
  }

  const manifest: VisualBaselineManifest = {
    chromiumRevision: PINNED_CHROMIUM_REVISION,
    approvalRequired: true,
    suites: suiteEntries,
  };
  writeVisualBaselineManifest(manifest);

  const regionSuites = suiteEntries.filter(
    (entry) => entry.diffMode === "region",
  );
  console.log(
    `\nManifest updated (${suiteEntries.length} suite entries, Chromium ${PINNED_CHROMIUM_REVISION}).`,
  );
  console.log(
    `Region-scoped suites: ${regionSuites.map((s) => `${s.id}/${s.locale} (${s.regions?.length ?? 0} regions)`).join(", ") || "none"}.`,
  );
  console.log(
    "NOTE: commit baseline PNGs only after human visual approval of every page/region.",
  );

  await closeEvidencePackBrowser();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
