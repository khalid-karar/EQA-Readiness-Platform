import { test, expect } from "@playwright/test";
import { buildE2eSessionCookie } from "./helpers/auth-session";

const SHELL_ROUTES = [
  { path: "/dashboard", name: "dashboard" },
  { path: "/assessment", name: "assessment" },
  { path: "/evidence", name: "evidence" },
  { path: "/findings", name: "findings" },
  { path: "/working-papers", name: "working-papers" },
  { path: "/remediation", name: "remediation" },
  { path: "/mock-eqa", name: "mock-eqa" },
  { path: "/evidence-pack", name: "evidence-pack" },
] as const;

test.describe("Real-data screen screenshots", () => {
  test.skip(
    () => !process.env.DATABASE_URL,
    "DATABASE_URL required for Postgres-backed UI reads",
  );

  test.beforeEach(async ({ context }) => {
    const cookie = await buildE2eSessionCookie();
    await context.addCookies([cookie]);
  });

  for (const route of SHELL_ROUTES) {
    test(`screenshot ${route.name}`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page.locator("main")).toBeVisible();
      await page.screenshot({
        path: `test-results/screenshots/${route.name}.png`,
        fullPage: true,
      });
    });
  }
});
