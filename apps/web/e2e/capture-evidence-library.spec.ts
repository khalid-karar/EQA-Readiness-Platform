import { test } from "@playwright/test";
import { join } from "node:path";
import { buildE2eSessionCookie } from "./helpers/auth-session";

const OUT_DIR = join(process.cwd(), "docs/screenshots");

test.describe("Evidence library screenshots", () => {
  test.beforeEach(async ({ context }) => {
    const cookie = await buildE2eSessionCookie();
    await context.addCookies([cookie]);
  });

  for (const { locale, suffix } of [
    { locale: "en", suffix: "en" },
    { locale: "ar", suffix: "ar" },
  ]) {
    test(`capture evidence library ${suffix}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(
        `/evidence?locale=${locale}&role=cae&evidence=ev-coi-spreadsheet@1`,
      );
      await page.waitForSelector("#main-content table tbody tr");
      await page.screenshot({
        path: join(OUT_DIR, `evidence-${suffix}.png`),
        fullPage: true,
      });
    });
  }
});
