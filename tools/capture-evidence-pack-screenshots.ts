/**
 * Captures evidence pack screen screenshots (EN + AR).
 * Usage: start the web app, then `pnpm exec tsx tools/capture-evidence-pack-screenshots.ts`
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import puppeteer from "puppeteer";

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
      const url = `${BASE_URL}/evidence-pack?locale=${locale}&role=cae`;
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.waitForSelector("[data-testid='evidence-pack-disclaimer']", {
        timeout: 30_000,
      });
      await page.waitForSelector("table", { timeout: 30_000 });
      const outPath = join(OUT_DIR, `evidence-pack-${suffix}.png`);
      await page.screenshot({ path: outPath, fullPage: true });
      console.log(`Wrote ${outPath}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
