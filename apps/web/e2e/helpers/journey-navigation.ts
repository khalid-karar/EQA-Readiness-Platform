import { expect, type Page } from "@playwright/test";
import type { ExpectedCheckpoint } from "./journey-expectations";

export async function clickJourneyCheckpoint(
  page: Page,
  stepperLabel: string,
  checkpoint: ExpectedCheckpoint,
): Promise<void> {
  const stepper = page.locator(`nav[aria-label="${stepperLabel}"]`);
  const link = stepper.locator(`a[href*="${checkpoint.href}"]`).filter({
    hasText: checkpoint.label,
  });
  await expect(link).toBeVisible();
  await link.click();
  await page.waitForURL((url) => url.pathname.includes(checkpoint.href));
}

export async function openMainTableRowSideSheet(page: Page): Promise<void> {
  const table = page.locator("#main-content table tbody");
  const row = table.locator("tr").first();
  await expect(row).toBeVisible();
  await row.click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

export async function assertSideSheetOnTrailingEdge(page: Page): Promise<void> {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const dialogBox = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(dialogBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(dialogBox!.x + dialogBox!.width / 2).toBeGreaterThan(
    viewport!.width / 2,
  );
}

export async function assertRtlShellMirrors(page: Page): Promise<void> {
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const aside = page.locator("aside").first();
  const main = page.locator("#main-content");
  await expect(aside).toBeVisible();
  await expect(main).toBeVisible();
  const asideBox = await aside.boundingBox();
  const mainBox = await main.boundingBox();
  expect(asideBox).not.toBeNull();
  expect(mainBox).not.toBeNull();
  expect(asideBox!.x).toBeGreaterThan(mainBox!.x);
}
