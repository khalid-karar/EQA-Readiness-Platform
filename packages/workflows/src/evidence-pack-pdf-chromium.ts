import { createHash } from "node:crypto";
import puppeteer, { type Browser } from "puppeteer";
import type { EvidencePackManifest } from "./evidence-pack";
import { buildEvidencePackHtml } from "./evidence-pack-html-template";
import { resolvePinnedChromiumExecutable } from "./evidence-pack-chromium-path";
import { PINNED_CHROMIUM_REVISION } from "./evidence-pack-chromium-pin";
import { normalizePdfBytes } from "./evidence-pack-pdf-normalize";

/** Fixed clock for deterministic PDF metadata and tests. */
export const EVIDENCE_PACK_RENDER_CLOCK = "2026-06-19T12:00:00.000Z";

export { PINNED_CHROMIUM_REVISION };

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

/** Reuse one browser per process when set (vitest/CI). Next.js leaves this unset. */
const REUSE_BROWSER = process.env.EQA_PDF_REUSE_BROWSER === "true";

const BROWSER_GLOBAL_KEY = "__eqaEvidencePackBrowser";

type BrowserGlobal = typeof globalThis & {
  [BROWSER_GLOBAL_KEY]?: Browser;
};

function browserGlobal(): BrowserGlobal {
  return globalThis;
}

async function launchBrowser(): Promise<Browser> {
  process.env.PUPPETEER_SKIP_DOWNLOAD = "true";
  return puppeteer.launch({
    headless: true,
    executablePath: resolvePinnedChromiumExecutable(),
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--font-render-hinting=none",
    ],
  });
}

let browserLaunch: Promise<Browser> | undefined;

async function getSharedBrowser(): Promise<Browser> {
  const g = browserGlobal();
  if (g[BROWSER_GLOBAL_KEY]?.connected) {
    return g[BROWSER_GLOBAL_KEY]!;
  }

  if (!browserLaunch) {
    browserLaunch = (async () => {
      try {
        if (g[BROWSER_GLOBAL_KEY]) {
          await g[BROWSER_GLOBAL_KEY].close().catch(() => undefined);
          delete g[BROWSER_GLOBAL_KEY];
        }
        const browser = await launchBrowser();
        g[BROWSER_GLOBAL_KEY] = browser;
        return browser;
      } finally {
        browserLaunch = undefined;
      }
    })();
  }

  return browserLaunch;
}

async function withBrowser<T>(
  work: (browser: Browser) => Promise<T>,
): Promise<T> {
  if (REUSE_BROWSER) {
    return work(await getSharedBrowser());
  }

  const browser = await launchBrowser();
  try {
    return await work(browser);
  } finally {
    await browser.close().catch(() => undefined);
  }
}

/** Closes the shared Puppeteer browser (for test teardown). */
export async function closeEvidencePackBrowser(): Promise<void> {
  const g = browserGlobal();
  if (g[BROWSER_GLOBAL_KEY]) {
    await g[BROWSER_GLOBAL_KEY].close().catch(() => undefined);
    delete g[BROWSER_GLOBAL_KEY];
  }
}

export interface RenderEvidencePackPdfOptions {
  readonly clock?: string;
}

/**
 * Renders evidence pack HTML to PDF via headless Chromium. Mixed Arabic/Latin
 * ordering is handled by the browser bidi engine — no manual glyph placement.
 */
export async function renderEvidencePackPdfChromium(
  manifest: EvidencePackManifest,
  _options: RenderEvidencePackPdfOptions = {},
): Promise<Uint8Array> {
  const html = buildEvidencePackHtml(manifest);

  return withBrowser(async (browser) => {
    const page = await browser.newPage();
    try {
      await page.emulateMediaType("print");
      await page.setViewport({
        width: A4_WIDTH_PX,
        height: A4_HEIGHT_PX,
        deviceScaleFactor: 1,
      });

      await page.setContent(html, { waitUntil: "load" });
      await page.evaluate("document.fonts.ready");

      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
        tagged: false,
        outline: false,
      });

      return normalizePdfBytes(pdf);
    } finally {
      await page.close().catch(() => undefined);
    }
  });
}

/** SHA-256 of rendered PDF bytes (after deterministic normalization). */
export function evidencePackPdfSha256(pdfBytes: Uint8Array): string {
  return createHash("sha256").update(pdfBytes).digest("hex");
}

/**
 * Screenshots the first page of the evidence pack HTML at print layout.
 * More reliable than PDF rasterization across platforms.
 */
export async function screenshotEvidencePackHtmlPage1(
  manifest: EvidencePackManifest,
): Promise<Uint8Array> {
  const html = buildEvidencePackHtml(manifest);

  return withBrowser(async (browser) => {
    const page = await browser.newPage();
    try {
      await page.emulateMediaType("print");
      await page.setViewport({
        width: A4_WIDTH_PX,
        height: A4_HEIGHT_PX,
        deviceScaleFactor: 1,
      });
      await page.setContent(html, { waitUntil: "load" });
      await page.evaluate("document.fonts.ready");

      const screenshot = await page.screenshot({
        type: "png",
        fullPage: false,
        clip: { x: 0, y: 0, width: A4_WIDTH_PX, height: A4_HEIGHT_PX },
      });

      return Uint8Array.from(screenshot);
    } finally {
      await page.close().catch(() => undefined);
    }
  });
}
