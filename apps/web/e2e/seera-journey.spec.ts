import { test, expect, type Page } from "@playwright/test";
import type { Locale } from "@eqa/content";
import { MOCK_EQA_DISCLAIMER } from "@eqa/workflows";
import {
  expectedJourneyCheckpoints,
  journeyQuery,
} from "./helpers/journey-expectations";
import { uiLabel } from "../lib/ui-labels";

async function assertNoRawBlanks(page: Page): Promise<void> {
  const main = page.locator("#main-content");
  await expect(main).toBeVisible();
  const text = (await main.innerText()).trim();
  expect(text.length).toBeGreaterThan(30);
  expect(text).not.toMatch(/^\s*—\s*$/m);
  await expect(page.locator("#main-content .animate-pulse")).toHaveCount(0);
}

async function runSeeraJourney(locale: Locale, page: Page): Promise<void> {
  const q = journeyQuery(locale);
  const checkpoints = expectedJourneyCheckpoints(locale);
  const stepperLabel = uiLabel("journeyStepperLabel", locale);

  await test.step("Landing / redirects to dashboard", async () => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto(`/dashboard${q}`);
    await expect(page).toHaveURL(`/dashboard${q}`);
    await assertNoRawBlanks(page);
  });

  await test.step("Dashboard — journey map renders seven checkpoints", async () => {
    await expect(
      page.getByRole("heading", { name: uiLabel("journeyMapTitle", locale) }),
    ).toBeVisible();

    const stepper = page.locator(`nav[aria-label="${stepperLabel}"]`);
    await expect(stepper).toBeVisible();

    const checkpointLinks = stepper.locator("a[href]");
    await expect(checkpointLinks).toHaveCount(7);
  });

  await test.step("Dashboard — checkpoint states match synthetic readiness data", async () => {
    const stepper = page.locator(`nav[aria-label="${stepperLabel}"]`);

    for (const cp of checkpoints) {
      const link = stepper.locator(`a[href*="${cp.href}"]`).filter({
        hasText: cp.label,
      });
      await expect(link).toBeVisible();
      await expect(link).toContainText(cp.stateLabel);
      await expect(link).toContainText(`${cp.percent}%`);
      await expect(link).toContainText(cp.metric);
    }
  });

  await test.step("Dashboard — gaps checkpoint navigates to findings", async () => {
    const gaps = checkpoints.find((c) => c.id === "gaps-identified");
    expect(gaps).toBeDefined();
    const stepper = page.locator(`nav[aria-label="${stepperLabel}"]`);
    await stepper
      .locator(`a[href*="/findings"]`)
      .filter({ hasText: gaps!.label })
      .click();
    await expect(page).toHaveURL(`/findings${q}`);
    await assertNoRawBlanks(page);
  });

  await test.step("Findings — open review SideSheet", async () => {
    const table = page.locator("#main-content table tbody");
    await expect(table.locator("tr").first()).toBeVisible();
    await table.locator("tr").first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("button", {
        name: locale === "ar" ? "قبول المسودة" : "Accept draft",
      }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  await test.step("Remediation — tracker loads with synthetic rows", async () => {
    await page.goto(`/remediation${q}`);
    await assertNoRawBlanks(page);
    const rows = page.locator("#main-content table tbody tr");
    await expect(rows).not.toHaveCount(0);
    await expect(
      page.getByText(/retest|إعادة الاختبار|Synthetic failed retest/i).first(),
    ).toBeVisible();
  });

  await test.step("Mock-EQA — simulation framing is visible", async () => {
    await page.goto(`/mock-eqa${q}`);
    await assertNoRawBlanks(page);
    const disclaimer = page.getByTestId("mock-eqa-disclaimer");
    await expect(disclaimer).toBeVisible();
    const disclaimerText =
      locale === "ar" ? MOCK_EQA_DISCLAIMER.ar : MOCK_EQA_DISCLAIMER.en;
    await expect(disclaimer).toContainText(
      disclaimerText.slice(0, 40).trim(),
    );
    await expect(disclaimer).toContainText(
      locale === "ar" ? "محاكاة" : "SIMULATION",
    );
    await expect(disclaimer).toContainText(
      locale === "ar" ? "رسمية" : "official",
    );
  });

  await test.step("Evidence pack — PDF sample download succeeds", async () => {
    await page.goto(`/evidence-pack${q}`);
    await assertNoRawBlanks(page);
    const response = await page.request.get(
      `/api/evidence-pack/sample?locale=${locale}`,
    );
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"] ?? "").toContain(
      "application/pdf",
    );
    const body = await response.body();
    expect(body.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(body.length).toBeGreaterThan(1000);
  });

  if (locale === "ar") {
    await test.step("AR — document dir=rtl and layout mirrors", async () => {
      await page.goto(`/dashboard${q}`);
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      await expect(page.locator('[dir="rtl"]').first()).toBeVisible();

      const aside = page.locator("aside").first();
      const main = page.locator("#main-content");
      const asideBox = await aside.boundingBox();
      const mainBox = await main.boundingBox();
      expect(asideBox).not.toBeNull();
      expect(mainBox).not.toBeNull();
      expect(asideBox!.x).toBeGreaterThan(mainBox!.x);

      await page.goto(`/findings${q}`);
      await page.locator("#main-content table tbody tr").first().click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      const dialogBox = await dialog.boundingBox();
      const viewport = page.viewportSize();
      expect(dialogBox).not.toBeNull();
      expect(viewport).not.toBeNull();
      expect(dialogBox!.x + dialogBox!.width / 2).toBeGreaterThan(
        viewport!.width / 2,
      );
      await page.keyboard.press("Escape");
    });
  }
}

test.describe("Seera pilot synthetic journey", () => {
  test("English (EN)", async ({ page }) => {
    await runSeeraJourney("en", page);
  });

  test("Arabic (AR) with RTL layout", async ({ page }) => {
    await runSeeraJourney("ar", page);
  });
});
