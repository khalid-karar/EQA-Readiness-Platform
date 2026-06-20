import puppeteer, { type Browser } from "puppeteer";
import { buildEvidencePackHtml } from "./evidence-pack-html-template";
import { resolvePinnedChromiumExecutable } from "./evidence-pack-chromium-path";
import type { EvidencePackManifest } from "./evidence-pack";
import type { VisualRegionBox } from "./evidence-pack-visual-regression";

const A4_WIDTH_PX = 794;

async function withMeasureBrowser<T>(
  work: (browser: Browser) => Promise<T>,
): Promise<T> {
  process.env.PUPPETEER_SKIP_DOWNLOAD = "true";
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: resolvePinnedChromiumExecutable(),
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--font-render-hinting=none",
    ],
  });
  try {
    return await work(browser);
  } finally {
    await browser.close().catch(() => undefined);
  }
}

/**
 * Measures `[data-visual-region]` boxes from the print-layout HTML and maps
 * document Y coordinates onto pdftoppm page images using {@link pageHeightPx}.
 */
export async function measureVisualRegionsFromHtml(
  html: string,
  pageHeightPx: number,
): Promise<VisualRegionBox[]> {
  return withMeasureBrowser(async (browser) => {
    const page = await browser.newPage();
    try {
      await page.emulateMediaType("print");
      await page.setViewport({
        width: A4_WIDTH_PX,
        height: 800,
        deviceScaleFactor: 1,
      });
      await page.setContent(html, { waitUntil: "load" });
      await page.evaluate("document.fonts.ready");

      const bodyHeight = await page.evaluate(
        () => document.body.scrollHeight as number,
      );
      await page.setViewport({
        width: A4_WIDTH_PX,
        height: bodyHeight,
        deviceScaleFactor: 1,
      });

      const raw = await page.evaluate((pageHeight) => {
        const nodes = Array.from(
          document.querySelectorAll("[data-visual-region]"),
        );
        return nodes.map((element) => {
          const rect = element.getBoundingClientRect();
          const top = rect.top + window.scrollY;
          const pageIndex = Math.floor(top / pageHeight);
          return {
            id:
              element.getAttribute("data-region-id") ??
              element.getAttribute("data-visual-region") ??
              "unknown",
            page: pageIndex + 1,
            x: Math.round(rect.left),
            y: Math.round(top - pageIndex * pageHeight),
            width: Math.ceil(rect.width),
            height: Math.ceil(rect.height),
          };
        });
      }, pageHeightPx);

      return raw.filter(
        (region) => region.width > 0 && region.height > 0,
      ) as VisualRegionBox[];
    } finally {
      await page.close().catch(() => undefined);
    }
  });
}

export async function measureVisualRegionsFromManifest(
  manifest: EvidencePackManifest,
  pageHeightPx: number,
): Promise<VisualRegionBox[]> {
  return measureVisualRegionsFromHtml(
    buildEvidencePackHtml(manifest),
    pageHeightPx,
  );
}
