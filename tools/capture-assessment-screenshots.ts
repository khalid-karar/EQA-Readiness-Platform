/**
 * Captures assessment questionnaire screenshots (EN + AR, with side sheet).
 * Usage: start the web app, then `pnpm exec tsx tools/capture-assessment-screenshots.ts`
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

    for (const { locale, suffix, standard, question } of [
      {
        locale: "en",
        suffix: "en",
        standard: "1.2",
        question: "Q-1-2-2",
      },
      {
        locale: "ar",
        suffix: "ar",
        standard: "1.2",
        question: "Q-1-2-2",
      },
    ]) {
      const url = `${BASE_URL}/assessment?locale=${locale}&role=cae&standard=${standard}&question=${question}`;
      await page.goto(url, { waitUntil: "networkidle0", timeout: 120_000 });
      await page.waitForSelector("[role='dialog']", { timeout: 30_000 });
      const outPath = join(OUT_DIR, `assessment-${suffix}.png`);
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
