import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import type { Role } from "@eqa/auth";
import { buildE2eSessionCookie } from "./helpers/auth-session";

async function primeE2eTenantAuth(
  context: BrowserContext,
  role: Role,
  tenant: string,
  baseURL: string,
): Promise<void> {
  await context.clearCookies();
  await context.addCookies([await buildE2eSessionCookie(role, tenant, baseURL)]);
}

/**
 * Real-Postgres tenant-isolation checks. Run with the real-DB config
 * (`pnpm --filter @eqa/web test:e2e:realdb`), where demo fixtures are OFF so the
 * dashboard reads each tenant's own Postgres schema.
 *
 * Markers are tenant-scoped DB rows surfaced on /dashboard through the
 * cockpit "What's next" queue (`buildPendingActions`):
 *
 *  - SEERA marker — "AI gap(s) awaiting review": produced by AI-flagged /
 *    pending-review draft findings that the Seera-pilot seed creates ONLY in
 *    the seera-pilot schema.
 *
 *  - BETA marker — "item(s) answered but no evidence yet": produced by an
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
const SEERA_MARKER = /AI gap\(s\) awaiting review/i;
const BETA_MARKER = /item\(s\) answered but no evidence yet/i;

async function gotoDashboard(page: Page): Promise<number> {
  const health = await page.request.get("/health");
  const body = (await health.json()) as {
    databaseConfigured?: boolean;
    demoFixturesEnabled?: boolean;
  };
  expect(body.databaseConfigured).toBe(true);
  expect(body.demoFixturesEnabled).toBe(false);

  const response = await page.goto("/dashboard");
  return response?.status() ?? 0;
}

test.describe("tenant isolation (real Postgres)", () => {
  test("seera-pilot dashboard shows seera data, not beta-co data", async ({
    context,
    page,
    baseURL,
  }) => {
    await primeE2eTenantAuth(context, "cae", "seera-pilot", baseURL!);

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
    baseURL,
  }) => {
    await primeE2eTenantAuth(context, "cae", "beta-co", baseURL!);

    const status = await gotoDashboard(page);
    // Loads successfully (not an error/forbidden page).
    expect(status).toBe(200);

    // Beta-co's own seeded DB marker is present (only possible from Postgres)...
    await expect(page.getByText(BETA_MARKER).first()).toBeVisible();
    // ...and seera-pilot's seeded DB marker never leaks in.
    await expect(page.getByText(SEERA_MARKER)).toHaveCount(0);
  });
});
