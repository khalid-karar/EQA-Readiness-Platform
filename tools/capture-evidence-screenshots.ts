/**
 * Captures evidence library screenshots (EN + AR).
 *
 * Prefer the Playwright helper (handles auth cookies + demo fixtures):
 *   cd apps/web && pnpm exec playwright test e2e/capture-evidence-library.spec.ts
 *
 * Legacy puppeteer entry point — requires a running app with demo auth env
 * (see playwright.config.ts webServer.env) and a valid session cookie.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import puppeteer from "puppeteer";

const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? "http://127.0.0.1:3000";
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
      const url = `${BASE_URL}/evidence?locale=${locale}&role=cae&evidence=ev-coi-spreadsheet@1`;
      await page.goto(url, { waitUntil: "networkidle0", timeout: 120_000 });
      await page.waitForSelector("#main-content table tbody tr", {
        timeout: 30_000,
      });
      const outPath = join(OUT_DIR, `evidence-${suffix}.png`);
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
