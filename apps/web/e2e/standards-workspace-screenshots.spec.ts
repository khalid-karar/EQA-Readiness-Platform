import { test, expect } from "@playwright/test";
import { buildE2eSessionCookie } from "./helpers/auth-session";

test.describe("Standards workspace screenshots", () => {
  test.beforeEach(async ({ context }) => {
    const cookie = await buildE2eSessionCookie("cae", "seera-pilot");
    await context.addCookies([cookie]);
  });

  for (const { locale, suffix } of [
    { locale: "en", suffix: "en" },
    { locale: "ar", suffix: "ar" },
  ]) {
    test(`standards workspace ${suffix}`, async ({ page }) => {
      const title =
        locale === "ar" ? "مساحة المعايير" : "Standards workspace";
      await page.goto(`/standards?locale=${locale}&role=cae`);
      await expect(
        page.getByRole("heading", { name: title, exact: true }),
      ).toBeVisible();
      await page.screenshot({
        path: `docs/screenshots/standards-workspace-${suffix}.png`,
        fullPage: true,
      });
    });
  }
});
