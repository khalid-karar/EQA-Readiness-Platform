/**
 * Captures branding screenshots: sidebar header (EN + AR) and favicon mark asset.
 * Usage: start the web app, then `pnpm exec tsx tools/capture-branding-screenshots.ts`
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import puppeteer from "puppeteer";

const MAYA_AI_LOGO_SRC = "/brand/maya-ai-logo.jpg";

const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = join(process.cwd(), "apps/web/docs/screenshots");

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

    for (const { locale, suffix } of [
      { locale: "en", suffix: "en" },
      { locale: "ar", suffix: "ar" },
    ]) {
      const url = `${BASE_URL}/dashboard?locale=${locale}&role=cae`;
      await page.goto(url, { waitUntil: "networkidle0", timeout: 120_000 });
      await page.waitForSelector(`img[src="${MAYA_AI_LOGO_SRC}"]`, {
        timeout: 30_000,
      });

      const naturalWidth = await page.$eval(
        `img[src="${MAYA_AI_LOGO_SRC}"]`,
        (img) => (img as HTMLImageElement).naturalWidth,
      );
      if (naturalWidth < 1) {
        throw new Error("Maya AI logo failed to load in the header");
      }

      const aside = await page.$("aside");
      const box = await aside?.boundingBox();
      if (!box) {
        throw new Error("Sidebar not found for branding screenshot");
      }

      const outPath = join(OUT_DIR, `branding-header-${suffix}.png`);
      await page.screenshot({
        path: outPath,
        clip: {
          x: box.x,
          y: box.y,
          width: box.width,
          height: Math.min(box.height, 220),
        },
      });
      console.log(`Wrote ${outPath}`);

      const title = await page.title();
      console.log(`Document title (${suffix}): ${title}`);
    }

    const faviconOut = join(OUT_DIR, "branding-favicon.png");
    copyFileSync(
      join(process.cwd(), "apps/web/app/icon.png"),
      faviconOut,
    );
    console.log(`Wrote ${faviconOut}`);
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
