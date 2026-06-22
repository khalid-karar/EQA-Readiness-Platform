/**
 * Captures readiness cockpit screenshots (EN + AR) including disclaimer.
 * Usage: start the web app with EQA_E2E_TEST_AUTH=true, then
 * `pnpm exec playwright test --config playwright.cockpit-screenshots.config.ts`
 */
import { test, expect } from "@playwright/test";
import { buildE2eSessionCookie } from "./helpers/auth-session";
import { uiLabel } from "../lib/ui-labels";

test.describe("Cockpit screenshots", () => {
  test.beforeEach(async ({ context }) => {
    const cookie = await buildE2eSessionCookie("cae", "seera-pilot");
    await context.addCookies([cookie]);
  });

  for (const { locale, suffix } of [
    { locale: "en" as const, suffix: "en" },
    { locale: "ar" as const, suffix: "ar" },
  ]) {
    test(`cockpit ${suffix}`, async ({ page }) => {
      const title = uiLabel("cockpitTitle", locale);
      await page.goto(`/dashboard?locale=${locale}&role=cae`);
      await expect(
        page.getByRole("heading", { name: title, exact: true }),
      ).toBeVisible();
      await expect(page.getByTestId("cockpit-readiness-disclaimer")).toBeVisible();
      await page.screenshot({
        path: `docs/screenshots/cockpit-${suffix}.png`,
        fullPage: true,
      });
    });
  }
});
