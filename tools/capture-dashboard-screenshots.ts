/**
 * Captures dashboard journey map screenshots (EN + AR).
 * Usage: start the web app first, then `pnpm exec tsx tools/capture-dashboard-screenshots.ts`
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import puppeteer from "puppeteer";

const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = join(
  process.cwd(),
  "apps/web/docs/screenshots",
);

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
      await page.waitForSelector("nav[aria-label]", { timeout: 30_000 });
      const outPath = join(OUT_DIR, `dashboard-journey-map-${suffix}.png`);
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
