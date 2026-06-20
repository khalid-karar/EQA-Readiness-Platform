import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import type { Locale } from "@eqa/content";
import { PINNED_CHROMIUM_REVISION } from "./evidence-pack-chromium-pin";
import {
  countPdfPages,
  isPopplerAvailable,
  rasterizePdfAllPagesWithPoppler,
} from "./evidence-pack-pdf-rasterize";

export const VISUAL_BASELINES_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  "__fixtures__",
  "visual-baselines",
);

export const VISUAL_MANIFEST_PATH = join(
  VISUAL_BASELINES_ROOT,
  "manifest.json",
);

/** pixelmatch sensitivity — shared by page and region diffs. */
export const PIXEL_DIFF_TOLERANCE = 0.02;

/** Whole-page diff budget (English suites). */
export const PAGE_MAX_MISMATCHING_PIXEL_RATIO = 0.02;

/** Per-region diff budget (Arabic / bidi-sensitive crops). */
export const REGION_MAX_MISMATCHING_PIXEL_RATIO = 0.005;

/** @deprecated Use {@link PAGE_MAX_MISMATCHING_PIXEL_RATIO}. */
export const MAX_MISMATCHING_PIXEL_RATIO = PAGE_MAX_MISMATCHING_PIXEL_RATIO;

export const BASELINE_APPROVAL_NOTE =
  "Requires human visual approval before updating any PNG in this folder.";

export const BASELINE_CHROMIUM_NOTE = (revision: string): string =>
  `Valid only for pinned Chromium revision ${revision}.`;

export type VisualDiffMode = "page" | "region";

export interface VisualRegionBox {
  readonly id: string;
  readonly page: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface VisualBaselineSuiteEntry {
  readonly id: string;
  readonly locale: Locale;
  readonly pages: number;
  readonly diffMode: VisualDiffMode;
  readonly regions?: readonly VisualRegionBox[];
}

export interface VisualBaselineManifest {
  readonly chromiumRevision: string;
  readonly approvalRequired: true;
  readonly suites: readonly VisualBaselineSuiteEntry[];
}

export function visualBaselineSuiteDir(
  suiteId: string,
  locale: Locale,
): string {
  return join(VISUAL_BASELINES_ROOT, suiteId, locale);
}

export function visualBaselineRegionsDir(
  suiteId: string,
  locale: Locale,
): string {
  return join(visualBaselineSuiteDir(suiteId, locale), "regions");
}

export function visualBaselinePagePath(
  suiteId: string,
  locale: Locale,
  page: number,
): string {
  const pageLabel = String(page).padStart(2, "0");
  return join(visualBaselineSuiteDir(suiteId, locale), `page-${pageLabel}.png`);
}

export function visualBaselineRegionPath(
  suiteId: string,
  locale: Locale,
  regionId: string,
): string {
  const safeId = regionId.replaceAll(/[^a-zA-Z0-9._-]+/g, "-");
  return join(visualBaselineRegionsDir(suiteId, locale), `${safeId}.png`);
}

export function visualBaselineReadmePath(
  suiteId: string,
  locale: Locale,
): string {
  return join(visualBaselineSuiteDir(suiteId, locale), "BASELINE.md");
}

export function defaultVisualDiffMode(locale: Locale): VisualDiffMode {
  return locale === "ar" ? "region" : "page";
}

export function writeVisualBaselineReadme(
  suiteId: string,
  locale: Locale,
  label: string,
  diffMode: VisualDiffMode = defaultVisualDiffMode(locale),
): void {
  const path = visualBaselineReadmePath(suiteId, locale);
  const regionNote =
    diffMode === "region"
      ? `
Region-scoped baselines live under \`regions/\` (metadata/timestamp band and
each evidence-index row). Each region is diffed independently at ≤0.5%.
`
      : "";
  const content = `# Visual baseline — ${label} (${locale.toUpperCase()})

${BASELINE_CHROMIUM_NOTE(PINNED_CHROMIUM_REVISION)}

${BASELINE_APPROVAL_NOTE}
${regionNote}
Regenerate all baselines:

\`\`\`bash
pnpm generate:evidence-pack-visual-baselines
\`\`\`
`;
  writeFileSync(path, content, "utf8");
}

export function readVisualBaselineManifest(): VisualBaselineManifest {
  return JSON.parse(
    readFileSync(VISUAL_MANIFEST_PATH, "utf8"),
  ) as VisualBaselineManifest;
}

export function writeVisualBaselineManifest(
  manifest: VisualBaselineManifest,
): void {
  writeFileSync(
    VISUAL_MANIFEST_PATH,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
}

export function comparePng(
  actual: Uint8Array,
  expected: Uint8Array,
  _maxMismatchRatio = PAGE_MAX_MISMATCHING_PIXEL_RATIO,
): { readonly mismatchRatio: number; readonly mismatchCount: number } {
  const actualPng = PNG.sync.read(Buffer.from(actual));
  const expectedPng = PNG.sync.read(Buffer.from(expected));

  if (
    actualPng.width !== expectedPng.width ||
    actualPng.height !== expectedPng.height
  ) {
    throw new Error(
      `PNG size mismatch: actual ${actualPng.width}x${actualPng.height}, expected ${expectedPng.width}x${expectedPng.height}`,
    );
  }

  const diff = new PNG({ width: actualPng.width, height: actualPng.height });
  const mismatchCount = pixelmatch(
    actualPng.data,
    expectedPng.data,
    diff.data,
    actualPng.width,
    actualPng.height,
    { threshold: PIXEL_DIFF_TOLERANCE },
  );
  const totalPixels = actualPng.width * actualPng.height;

  return {
    mismatchCount,
    mismatchRatio: mismatchCount / totalPixels,
  };
}

const REGION_CROP_PADDING_PX = 2;

/** Crops a rectangular region from a full-page PNG raster. */
export function cropPngRegion(
  pngBytes: Uint8Array,
  box: VisualRegionBox,
  paddingPx = REGION_CROP_PADDING_PX,
): Uint8Array {
  const source = PNG.sync.read(Buffer.from(pngBytes));
  const x = Math.max(0, box.x - paddingPx);
  const y = Math.max(0, box.y - paddingPx);
  const width = Math.min(source.width - x, box.width + paddingPx * 2);
  const height = Math.min(source.height - y, box.height + paddingPx * 2);

  if (width <= 0 || height <= 0) {
    throw new Error(
      `Invalid crop for region '${box.id}': ${width}x${height} at (${x},${y})`,
    );
  }

  const cropped = new PNG({ width, height });
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const srcIdx = ((y + row) * source.width + (x + col)) << 2;
      const dstIdx = (row * width + col) << 2;
      cropped.data[dstIdx] = source.data[srcIdx] ?? 0;
      cropped.data[dstIdx + 1] = source.data[srcIdx + 1] ?? 0;
      cropped.data[dstIdx + 2] = source.data[srcIdx + 2] ?? 0;
      cropped.data[dstIdx + 3] = source.data[srcIdx + 3] ?? 255;
    }
  }

  return Uint8Array.from(PNG.sync.write(cropped));
}

export interface PageRegressionMismatch {
  readonly page: number;
  readonly mismatchCount: number;
  readonly mismatchRatio: number;
}

export interface RegionRegressionMismatch {
  readonly regionId: string;
  readonly page: number;
  readonly mismatchCount: number;
  readonly mismatchRatio: number;
}

function findSuiteEntry(
  manifest: VisualBaselineManifest,
  suiteId: string,
  locale: Locale,
): VisualBaselineSuiteEntry {
  const suite = manifest.suites.find(
    (entry) => entry.id === suiteId && entry.locale === locale,
  );
  if (!suite) {
    throw new Error(
      `No manifest entry for suite '${suiteId}' locale '${locale}'`,
    );
  }
  return suite;
}

function loadRasterizedPages(
  pdfBytes: Uint8Array,
  suite: VisualBaselineSuiteEntry,
  suiteId: string,
  locale: Locale,
): Uint8Array[] {
  const rasterized = rasterizePdfAllPagesWithPoppler(pdfBytes);
  if (!rasterized) {
    throw new Error("pdftoppm failed to rasterize the evidence pack PDF");
  }

  if (rasterized.length !== suite.pages) {
    throw new Error(
      `Suite '${suiteId}' (${locale}) manifest expects ${suite.pages} page(s) but PDF has ${rasterized.length}`,
    );
  }

  return rasterized;
}

/**
 * Rasterizes every PDF page with pdftoppm and diffs against committed page baselines.
 * Requires poppler — returns a skip reason when pdftoppm is unavailable.
 */
export async function assertAllPagesMatchVisualBaselines(
  pdfBytes: Uint8Array,
  suiteId: string,
  locale: Locale,
): Promise<{ readonly skipped?: string }> {
  if (!isPopplerAvailable()) {
    return {
      skipped:
        "pdftoppm (poppler-utils) is not installed — multi-page visual regression skipped",
    };
  }

  const manifest = readVisualBaselineManifest();
  if (manifest.chromiumRevision !== PINNED_CHROMIUM_REVISION) {
    throw new Error(
      `manifest.chromiumRevision ${manifest.chromiumRevision} does not match PINNED_CHROMIUM_REVISION ${PINNED_CHROMIUM_REVISION}`,
    );
  }

  const suite = findSuiteEntry(manifest, suiteId, locale);
  if (suite.diffMode === "region") {
    throw new Error(
      `Suite '${suiteId}' (${locale}) uses region diff mode — call assertRegionsMatchVisualBaselines`,
    );
  }

  const rasterized = loadRasterizedPages(pdfBytes, suite, suiteId, locale);
  const pageCount = await countPdfPages(pdfBytes);
  if (rasterized.length !== pageCount) {
    throw new Error(
      `Rasterized ${rasterized.length} page(s) but PDF reports ${pageCount}`,
    );
  }

  const mismatches: PageRegressionMismatch[] = [];

  for (let page = 1; page <= suite.pages; page += 1) {
    const baselinePath = visualBaselinePagePath(suiteId, locale, page);
    if (!existsSync(baselinePath)) {
      throw new Error(
        `Missing baseline ${baselinePath}. Run pnpm generate:evidence-pack-visual-baselines`,
      );
    }

    const actual = rasterized[page - 1];
    if (!actual) {
      throw new Error(`Missing rasterized output for page ${page}`);
    }

    const expected = readFileSync(baselinePath);
    const { mismatchCount, mismatchRatio } = comparePng(
      actual,
      expected,
      PAGE_MAX_MISMATCHING_PIXEL_RATIO,
    );

    if (mismatchRatio > PAGE_MAX_MISMATCHING_PIXEL_RATIO) {
      mismatches.push({ page, mismatchCount, mismatchRatio });
    }
  }

  if (mismatches.length > 0) {
    const detail = mismatches
      .map(
        (m) =>
          `page ${m.page}: ${m.mismatchCount} px (${(m.mismatchRatio * 100).toFixed(2)}%)`,
      )
      .join("; ");
    throw new Error(
      `Visual regression failed for ${suiteId} (${locale}) ` +
        `[Chromium ${PINNED_CHROMIUM_REVISION}]: ${detail}. ` +
        `Regenerate with pnpm generate:evidence-pack-visual-baselines only after visual approval.`,
    );
  }

  return {};
}

/**
 * Crops metadata/timestamp and evidence-index rows from rasterized pages and
 * diffs each region against its own baseline at ≤0.5%.
 */
export async function assertRegionsMatchVisualBaselines(
  pdfBytes: Uint8Array,
  suiteId: string,
  locale: Locale,
): Promise<{ readonly skipped?: string }> {
  if (!isPopplerAvailable()) {
    return {
      skipped:
        "pdftoppm (poppler-utils) is not installed — region visual regression skipped",
    };
  }

  const manifest = readVisualBaselineManifest();
  if (manifest.chromiumRevision !== PINNED_CHROMIUM_REVISION) {
    throw new Error(
      `manifest.chromiumRevision ${manifest.chromiumRevision} does not match PINNED_CHROMIUM_REVISION ${PINNED_CHROMIUM_REVISION}`,
    );
  }

  const suite = findSuiteEntry(manifest, suiteId, locale);
  if (suite.diffMode !== "region") {
    throw new Error(
      `Suite '${suiteId}' (${locale}) uses page diff mode — call assertAllPagesMatchVisualBaselines`,
    );
  }

  const regions = suite.regions ?? [];
  if (regions.length === 0) {
    throw new Error(
      `Suite '${suiteId}' (${locale}) has no region definitions in manifest.json`,
    );
  }

  const rasterized = loadRasterizedPages(pdfBytes, suite, suiteId, locale);
  const mismatches: RegionRegressionMismatch[] = [];

  for (const region of regions) {
    const baselinePath = visualBaselineRegionPath(suiteId, locale, region.id);
    if (!existsSync(baselinePath)) {
      throw new Error(
        `Missing region baseline ${baselinePath}. Run pnpm generate:evidence-pack-visual-baselines`,
      );
    }

    const pagePng = rasterized[region.page - 1];
    if (!pagePng) {
      throw new Error(
        `Missing rasterized output for page ${region.page} (region '${region.id}')`,
      );
    }

    const actualCrop = cropPngRegion(pagePng, region);
    const expectedCrop = readFileSync(baselinePath);
    const { mismatchCount, mismatchRatio } = comparePng(
      actualCrop,
      expectedCrop,
      REGION_MAX_MISMATCHING_PIXEL_RATIO,
    );

    if (mismatchRatio > REGION_MAX_MISMATCHING_PIXEL_RATIO) {
      mismatches.push({
        regionId: region.id,
        page: region.page,
        mismatchCount,
        mismatchRatio,
      });
    }
  }

  if (mismatches.length > 0) {
    const detail = mismatches
      .map(
        (m) =>
          `${m.regionId} (page ${m.page}): ${m.mismatchCount} px (${(m.mismatchRatio * 100).toFixed(3)}%)`,
      )
      .join("; ");
    throw new Error(
      `Region visual regression failed for ${suiteId} (${locale}) ` +
        `[Chromium ${PINNED_CHROMIUM_REVISION}]: ${detail}. ` +
        `Regenerate with pnpm generate:evidence-pack-visual-baselines only after visual approval.`,
    );
  }

  return {};
}

export function writeRegionBaselines(
  suiteId: string,
  locale: Locale,
  rasterizedPages: readonly Uint8Array[],
  regions: readonly VisualRegionBox[],
): void {
  const regionsDir = visualBaselineRegionsDir(suiteId, locale);
  mkdirSync(regionsDir, { recursive: true });

  for (const region of regions) {
    const pagePng = rasterizedPages[region.page - 1];
    if (!pagePng) {
      throw new Error(
        `Cannot write region '${region.id}': page ${region.page} raster missing`,
      );
    }
    const crop = cropPngRegion(pagePng, region);
    const outPath = visualBaselineRegionPath(suiteId, locale, region.id);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, Buffer.from(crop));
  }
}
