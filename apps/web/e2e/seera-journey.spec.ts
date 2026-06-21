import { test, expect, type Page } from "@playwright/test";
import type { Locale } from "@eqa/content";
import { MOCK_EQA_DISCLAIMER } from "@eqa/workflows";
import { buildE2eSessionCookie } from "./helpers/auth-session";
import {
  expectedJourneyCheckpoints,
  journeyQuery,
  type ExpectedCheckpoint,
} from "./helpers/journey-expectations";
import {
  assertRtlShellMirrors,
  assertSideSheetOnTrailingEdge,
  clickJourneyCheckpoint,
  openMainTableRowSideSheet,
} from "./helpers/journey-navigation";
import {
  assessmentScreenMarkers,
  evidenceScreenMarkers,
  workingPapersScreenMarkers,
} from "./helpers/screen-expectations";
import { uiLabel } from "../lib/ui-labels";

async function assertNoRawBlanks(page: Page, locale: Locale): Promise<void> {
  const main = page.locator("#main-content");
  await expect(main).toBeVisible();
  const text = (await main.innerText()).trim();
  expect(text.length).toBeGreaterThan(30);
  expect(text).not.toMatch(/^\s*—\s*$/m);
  await expect(page.locator("#main-content .animate-pulse")).toHaveCount(0);
  await expect(page.getByText(uiLabel("comingSoon", locale))).toHaveCount(0);
}

function findCheckpoint(
  checkpoints: ExpectedCheckpoint[],
  id: string,
): ExpectedCheckpoint {
  const cp = checkpoints.find((c) => c.id === id);
  expect(cp).toBeDefined();
  return cp!;
}

async function runSeeraJourney(locale: Locale, page: Page): Promise<void> {
  const q = journeyQuery(locale);
  const checkpoints = expectedJourneyCheckpoints(locale);
  const stepperLabel = uiLabel("journeyStepperLabel", locale);
  const assessmentMarkers = assessmentScreenMarkers(locale);
  const evidenceMarkers = evidenceScreenMarkers(locale);
  const wpMarkers = workingPapersScreenMarkers(locale);

  await test.step("Landing / dashboard", async () => {
    await page.goto(`/dashboard${q}`);
    await expect(page).toHaveURL(`/dashboard${q}`);
    await assertNoRawBlanks(page, locale);
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

  await test.step(
    "Dashboard — scope checkpoint (1) navigates to Assessment",
    async () => {
      await page.goto(`/dashboard${q}`);
      await clickJourneyCheckpoint(
        page,
        stepperLabel,
        findCheckpoint(checkpoints, "scope"),
      );
      await expect(page).toHaveURL(`/assessment${q}`);
      await assertNoRawBlanks(page, locale);
      await expect(
        page.getByRole("heading", { name: uiLabel("assessmentTitle", locale) }),
      ).toBeVisible();
    },
  );

  await test.step("Assessment — synthetic scope rows and content pack", async () => {
    await expect(
      page.getByRole("heading", {
        name: uiLabel("assessmentContentPack", locale),
      }),
    ).toBeVisible();
    await expect(page.getByText(assessmentMarkers.pinSnippet).first()).toBeVisible();
    await expect(
      page.getByText(assessmentMarkers.standardNumber).first(),
    ).toBeVisible();
    const rows = page.locator("#main-content table tbody tr");
    await expect(rows).toHaveCount(assessmentMarkers.rowCount);
  });

  await test.step("Assessment — open question SideSheet", async () => {
    const row = page
      .locator("#main-content table tbody tr")
      .filter({ hasText: assessmentMarkers.standardNumber })
      .first();
    await expect(row).toBeVisible();
    await row.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(assessmentMarkers.standardNumber);
    await expect(dialog).toContainText(assessmentMarkers.questionId);
    await expect(dialog).toContainText(assessmentMarkers.responseAnswer);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  await test.step(
    "Dashboard — evidence checkpoint (2) navigates to Evidence",
    async () => {
      await page.goto(`/dashboard${q}`);
      await clickJourneyCheckpoint(
        page,
        stepperLabel,
        findCheckpoint(checkpoints, "evidence"),
      );
      await expect(page).toHaveURL(`/evidence${q}`);
      await assertNoRawBlanks(page, locale);
      await expect(
        page.getByRole("heading", { name: uiLabel("evidenceTitle", locale) }),
      ).toBeVisible();
    },
  );

  await test.step("Evidence — synthetic repository rows and quarantine banner", async () => {
    await expect(
      page.getByRole("heading", {
        name: uiLabel("evidenceQuarantineBanner", locale),
      }),
    ).toBeVisible();
    await expect(
      page.getByText(String(evidenceMarkers.clearedCount)).first(),
    ).toBeVisible();
    await expect(
      page.getByText(String(evidenceMarkers.quarantinedCount)).first(),
    ).toBeVisible();
    const rows = page.locator("#main-content table tbody tr");
    await expect(rows).toHaveCount(evidenceMarkers.rowCount);
    await expect(
      page.getByText(evidenceMarkers.cleanStandardNumber).first(),
    ).toBeVisible();
  });

  await test.step("Evidence — open evidence SideSheet", async () => {
    const row = page
      .locator("#main-content table tbody tr")
      .filter({ hasText: evidenceMarkers.cleanStandardNumber })
      .first();
    await expect(row).toBeVisible();
    await row.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(evidenceMarkers.cleanFileName);
    await expect(dialog).toContainText(evidenceMarkers.cleanStandardNumber);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  await test.step(
    "Dashboard — methodology checkpoint (4) navigates to Working Papers",
    async () => {
      await page.goto(`/dashboard${q}`);
      await clickJourneyCheckpoint(
        page,
        stepperLabel,
        findCheckpoint(checkpoints, "methodology"),
      );
      await expect(page).toHaveURL(`/working-papers${q}`);
      await assertNoRawBlanks(page, locale);
      await expect(
        page.getByRole("heading", { name: uiLabel("wpTitle", locale) }),
      ).toBeVisible();
    },
  );

  await test.step("Working Papers — synthetic checklist rows and unreviewed rollup", async () => {
    await expect(
      page.getByRole("heading", {
        name: uiLabel("wpUnreviewedBanner", locale),
      }),
    ).toBeVisible();
    await expect(
      page.getByText(String(wpMarkers.unreviewedCount)).first(),
    ).toBeVisible();
    await expect(
      page.getByText(wpMarkers.engagementTitleSnippet).first(),
    ).toBeVisible();
    const rows = page.locator("#main-content table tbody tr");
    await expect(rows).toHaveCount(wpMarkers.rowCount);
    await expect(page.getByText(wpMarkers.workingPaperRef).first()).toBeVisible();
  });

  await test.step("Working Papers — open review SideSheet", async () => {
    const row = page
      .locator("#main-content table tbody tr")
      .filter({ hasText: wpMarkers.workingPaperRef })
      .first();
    await expect(row).toBeVisible();
    await row.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(wpMarkers.itemId);
    await expect(dialog).toContainText(wpMarkers.workingPaperRef);
    await expect(dialog).toContainText(wpMarkers.conformantItemTextSnippet);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  await test.step("Dashboard — gaps checkpoint navigates to findings", async () => {
    await page.goto(`/dashboard${q}`);
    const gaps = findCheckpoint(checkpoints, "gaps-identified");
    await clickJourneyCheckpoint(page, stepperLabel, gaps);
    await expect(page).toHaveURL(`/findings${q}`);
    await assertNoRawBlanks(page, locale);
  });

  await test.step("Findings — open review SideSheet", async () => {
    await openMainTableRowSideSheet(page);
    const dialog = page.getByRole("dialog");
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
    await assertNoRawBlanks(page, locale);
    const rows = page.locator("#main-content table tbody tr");
    await expect(rows).not.toHaveCount(0);
    await expect(
      page.getByText(/retest|إعادة الاختبار|Synthetic failed retest/i).first(),
    ).toBeVisible();
  });

  await test.step("Mock-EQA — simulation framing is visible", async () => {
    await page.goto(`/mock-eqa${q}`);
    await assertNoRawBlanks(page, locale);
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
    await assertNoRawBlanks(page, locale);
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
    await test.step("AR — RTL shell and SideSheet mirroring on all list screens", async () => {
      await page.goto(`/dashboard${q}`);
      await assertRtlShellMirrors(page);

      await clickJourneyCheckpoint(
        page,
        stepperLabel,
        findCheckpoint(checkpoints, "scope"),
      );
      await openMainTableRowSideSheet(page);
      await assertSideSheetOnTrailingEdge(page);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toBeHidden();

      await page.goto(`/dashboard${q}`);
      await clickJourneyCheckpoint(
        page,
        stepperLabel,
        findCheckpoint(checkpoints, "evidence"),
      );
      await openMainTableRowSideSheet(page);
      await assertSideSheetOnTrailingEdge(page);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toBeHidden();

      await page.goto(`/dashboard${q}`);
      await clickJourneyCheckpoint(
        page,
        stepperLabel,
        findCheckpoint(checkpoints, "methodology"),
      );
      await openMainTableRowSideSheet(page);
      await assertSideSheetOnTrailingEdge(page);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toBeHidden();

      await page.goto(`/dashboard${q}`);
      await clickJourneyCheckpoint(
        page,
        stepperLabel,
        findCheckpoint(checkpoints, "gaps-identified"),
      );
      await openMainTableRowSideSheet(page);
      await assertSideSheetOnTrailingEdge(page);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toBeHidden();
    });
  }
}

test.describe("Seera pilot synthetic journey", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([await buildE2eSessionCookie("cae")]);
  });

  test("English (EN)", async ({ page }) => {
    await runSeeraJourney("en", page);
  });

  test("Arabic (AR) with RTL layout", async ({ page }) => {
    test.setTimeout(90_000);
    await runSeeraJourney("ar", page);
  });
});
