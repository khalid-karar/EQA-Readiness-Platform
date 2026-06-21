import { expect, test, type Page } from "@playwright/test";
import { buildE2eSessionCookie } from "./helpers/auth-session";

/**
 * Real-Postgres tenant-isolation checks. Run with the real-DB config
 * (`pnpm --filter @eqa/web test:e2e:realdb`), where demo fixtures are OFF so the
 * dashboard reads each tenant's own Postgres schema.
 *
 * Markers are tenant-scoped DB rows surfaced on /dashboard through the
 * "What's Next" pending-action panel (workflows `buildPendingActions`):
 *
 *  - SEERA marker — "AI draft finding(s) pending review": produced by a
 *    `draft_findings` row (COI declarations, AI-flagged and never human-reviewed)
 *    that the Seera-pilot seed creates ONLY in the seera-pilot schema.
 *
 *  - BETA marker — "standard(s) need evidence": produced by an
 *    `assessment_item_status` row left in `evidence_requested` that the beta-co
 *    seed creates ONLY in the beta-co schema. The Seera-pilot seed leaves no
 *    item in `evidence_requested`, and the in-memory demo fixtures (which always
 *    return Seera data) never produce it either — so this marker can only render
 *    when beta-co's own Postgres schema was read. That gives the test teeth: if
 *    the server were on fixtures, the beta-co case would fail.
 *
 * Both directions assert presence of the tenant's own marker AND absence of the
 * other tenant's marker.
 */
const SEERA_MARKER = /AI draft finding\(s\) pending review/i;
const BETA_MARKER = /standard\(s\) need evidence/i;

async function gotoDashboard(page: Page): Promise<number> {
  const response = await page.goto("/dashboard");
  return response?.status() ?? 0;
}

test.describe("tenant isolation (real Postgres)", () => {
  test("seera-pilot dashboard shows seera data, not beta-co data", async ({
    context,
    page,
  }) => {
    await context.addCookies([
      await buildE2eSessionCookie("cae", "seera-pilot"),
    ]);

    const status = await gotoDashboard(page);
    expect(status).toBe(200);

    // Seera's own seeded DB marker is present...
    await expect(page.getByText(SEERA_MARKER).first()).toBeVisible();
    // ...and beta-co's seeded DB marker never leaks in.
    await expect(page.getByText(BETA_MARKER)).toHaveCount(0);
  });

  test("beta-co dashboard loads and shows beta data, not seera data", async ({
    context,
    page,
  }) => {
    await context.addCookies([await buildE2eSessionCookie("cae", "beta-co")]);

    const status = await gotoDashboard(page);
    // Loads successfully (not an error/forbidden page).
    expect(status).toBe(200);

    // Beta-co's own seeded DB marker is present (only possible from Postgres)...
    await expect(page.getByText(BETA_MARKER).first()).toBeVisible();
    // ...and seera-pilot's seeded DB marker never leaks in.
    await expect(page.getByText(SEERA_MARKER)).toHaveCount(0);
  });
});
