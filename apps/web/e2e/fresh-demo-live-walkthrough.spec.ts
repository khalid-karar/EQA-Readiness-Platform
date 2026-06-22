import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect, type Page } from "@playwright/test";
import { uiLabel } from "../lib/ui-labels";

const configDir = dirname(fileURLToPath(import.meta.url));
const screenshotDir = join(configDir, "..", "docs", "screenshots", "fresh-demo");
const samplePdf = join(configDir, "fixtures", "sample-evidence.pdf");
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

async function loginViaKeycloak(
  page: Page,
  username: string,
  password: string,
): Promise<void> {
  await page.goto(`${baseURL}/auth/login`);
  await page.waitForURL(/localhost:8080/);
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  await page.locator("#kc-login").click();
  await page.waitForURL(/localhost:3000/, { timeout: 60_000 });
}

async function runFreshDemoJourney(
  page: Page,
  locale: "en" | "ar",
  suffix: string,
): Promise<void> {
  const q = `?locale=${locale}&role=cae`;
  const notStarted = uiLabel("journeyStateNotStarted", locale);
  const gapFlagLabel = uiLabel("standardDetailRunGapFlag", locale);
  const acceptLabel = uiLabel("findingAccept", locale);
  const assignRemediation = uiLabel("standardDetailAssignRemediation", locale);

  await loginViaKeycloak(page, "fresh.demo", "demo");

  await test.step("Dashboard — empty tenant readiness", async () => {
    await page.goto(`${baseURL}/dashboard${q}`);
    await expect(page.locator("main")).toBeVisible();
    await page.screenshot({
      path: join(screenshotDir, `01-dashboard-${suffix}.png`),
      fullPage: true,
    });
    const mainText = await page.locator("main").innerText();
    expect(mainText).toMatch(/0\s*%/);
  });

  await test.step("Standards workspace — all not started", async () => {
    await page.goto(`${baseURL}/standards${q}`);
    const title =
      locale === "ar" ? "مساحة المعايير" : "Standards workspace";
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    const statusCells = page.getByText(notStarted, { exact: true });
    await expect(statusCells.first()).toBeVisible();
    expect(await statusCells.count()).toBeGreaterThan(0);
    await page.screenshot({
      path: join(screenshotDir, `02-standards-${suffix}.png`),
      fullPage: true,
    });
  });

  await test.step("Standard detail — rate, upload, gap-flag, accept", async () => {
    await page.goto(`${baseURL}/standards/1.1${q}`);
    await expect(page.locator("main")).toBeVisible();

    const requirementPanel = page.locator("main").locator("div.space-y-4").first();
    const gapFlagButton = requirementPanel.getByRole("button", { name: gapFlagLabel });
    const acceptButton = requirementPanel.getByRole("button", { name: acceptLabel });

    if (await gapFlagButton.isVisible().catch(() => false)) {
      const firstRubric = requirementPanel.locator("button").filter({ hasText: /—/ }).first();
      if (await firstRubric.isVisible().catch(() => false)) {
        await firstRubric.click();
        await requirementPanel
          .getByRole("button", { name: uiLabel("assessmentSubmit", locale) })
          .click();
      }

      const fileInput = requirementPanel.locator('input[type="file"]').first();
      if (await fileInput.isVisible().catch(() => false)) {
        await fileInput.setInputFiles(samplePdf);
        await requirementPanel
          .getByRole("button", { name: uiLabel("evidenceUpload", locale) })
          .click();
        await expect(
          page.getByText(uiLabel("evidenceUploadSuccess", locale)).first(),
        ).toBeVisible({ timeout: 60_000 });
        await page.screenshot({
          path: join(screenshotDir, `03-evidence-uploaded-${suffix}.png`),
          fullPage: true,
        });
      }

      await expect(gapFlagButton).toBeVisible({ timeout: 30_000 });
      await gapFlagButton.click();
      await expect(page.locator("main")).toContainText(/local-llm|draft/i, {
        timeout: 180_000,
      });
    }

    await page.screenshot({
      path: join(screenshotDir, `04-gap-flag-draft-${suffix}.png`),
      fullPage: true,
    });

    await page.goto(`${baseURL}/findings${q}`);
    await page.locator("#main-content table tbody tr").first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/local-llm/)).toBeVisible({ timeout: 15_000 });
    await page.screenshot({
      path: join(screenshotDir, `04b-provenance-${suffix}.png`),
      fullPage: true,
    });
    await page.keyboard.press("Escape");

    if (await acceptButton.isVisible().catch(() => false)) {
      await page.goto(`${baseURL}/standards/1.1${q}`);
      await page
        .locator("main")
        .locator("div.space-y-4")
        .first()
        .getByRole("button", { name: acceptLabel })
        .click();
      await expect(
        page.getByText(uiLabel("findingActionSuccess", locale)).first(),
      ).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(assignRemediation)).toBeVisible();
    }

    await page.screenshot({
      path: join(screenshotDir, `05-remediation-ready-${suffix}.png`),
      fullPage: true,
    });
  });

  await test.step("Remediation tracker — gap visible", async () => {
    await page.goto(`${baseURL}/remediation${q}`);
    await expect(
      page.getByRole("heading", { name: uiLabel("remediationTitle", locale) }),
    ).toBeVisible();
    await page.screenshot({
      path: join(screenshotDir, `06-remediation-${suffix}.png`),
      fullPage: true,
    });
  });
}

test.describe("Fresh demo live walkthrough (real Keycloak + Postgres)", () => {
  test.beforeAll(() => {
    mkdirSync(screenshotDir, { recursive: true });
  });

  test("fresh.demo EN journey", async ({ page }) => {
    test.setTimeout(600_000);
    await runFreshDemoJourney(page, "en", "en");
  });

  test("fresh.demo AR journey (screenshots)", async ({ page }) => {
    test.setTimeout(120_000);
    const q = "?locale=ar&role=cae";
    const notStarted = uiLabel("journeyStateNotStarted", "ar");

    await loginViaKeycloak(page, "fresh.demo", "demo");

    await page.goto(`${baseURL}/dashboard${q}`);
    await expect(page.locator("main")).toBeVisible();
    await page.screenshot({
      path: join(screenshotDir, "01-dashboard-ar.png"),
      fullPage: true,
    });

    await page.goto(`${baseURL}/standards${q}`);
    await expect(page.getByText(notStarted, { exact: true }).first()).toBeVisible();
    await page.screenshot({
      path: join(screenshotDir, "02-standards-ar.png"),
      fullPage: true,
    });

    await page.goto(`${baseURL}/standards/1.1${q}`);
    await expect(page.locator("main")).toBeVisible();
    await page.screenshot({
      path: join(screenshotDir, "04-gap-flag-draft-ar.png"),
      fullPage: true,
    });

    await page.goto(`${baseURL}/remediation${q}`);
    await expect(
      page.getByRole("heading", { name: uiLabel("remediationTitle", "ar") }),
    ).toBeVisible();
    await page.screenshot({
      path: join(screenshotDir, "06-remediation-ar.png"),
      fullPage: true,
    });
  });

  test("cae.demo still shows Seera showcase dashboard", async ({ page }) => {
    await loginViaKeycloak(page, "cae.demo", "demo");
    await page.goto(`${baseURL}/dashboard?locale=en&role=cae`);
    await expect(page.locator("main")).toBeVisible();
    const mainText = await page.locator("main").innerText();
    expect(mainText).not.toMatch(/^0\s*% readiness/m);
    expect(mainText.length).toBeGreaterThan(200);
    await page.screenshot({
      path: join(screenshotDir, "07-seera-showcase-en.png"),
      fullPage: true,
    });
  });
});
