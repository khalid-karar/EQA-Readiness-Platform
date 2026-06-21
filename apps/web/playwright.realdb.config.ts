import { defineConfig, devices } from "@playwright/test";

/**
 * Real-Postgres e2e config for the tenant-isolation suite.
 *
 * Unlike the default `playwright.config.ts` (which sets `EQA_UI_DEMO_FIXTURES`
 * so the journey/screenshot tests stay on in-memory synthetic fixtures), this
 * server deliberately does NOT enable demo fixtures. With `DATABASE_URL` loaded
 * from `.env.local`, `isDemoFixturesEnabled()` returns false and the dashboard
 * reads tenant-scoped data from each tenant's Postgres schema — which is what
 * the isolation assertions depend on. `EQA_E2E_TEST_AUTH` still selects the
 * static test identity provider so cookies minted by `buildE2eSessionCookie`
 * authenticate, but it no longer implies fixtures.
 *
 * Runs on a separate port (3100) so it never latches onto a stale fixture-mode
 * server left on :3000.
 */
const PORT = process.env.PLAYWRIGHT_REALDB_PORT ?? "3100";
const baseURL =
  process.env.PLAYWRIGHT_REALDB_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: ["**/tenant-isolation.spec.ts"],
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  outputDir: "test-results-realdb",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm run build && pnpm exec next start -p " + PORT,
    url: `${baseURL}/health`,
    // Always boot a fresh server so it cannot reuse a stale fixture-mode
    // process — the isolation test is only meaningful against Postgres.
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      KEYCLOAK_ISSUER: "https://keycloak.test/realms/eqa",
      KEYCLOAK_AUDIENCE: "eqa-web",
      KEYCLOAK_CLIENT_SECRET: "e2e-test-client-secret",
      AUTH_SESSION_SECRET: "e2e-test-session-secret-32-bytes-min",
      EQA_E2E_TEST_AUTH: "true",
      TENANT_ALLOWLIST: "seera-pilot,beta-co",
      PORT: String(PORT),
      NODE_ENV: "production",
      // NOTE: EQA_UI_DEMO_FIXTURES is intentionally NOT set here.
      // DATABASE_URL and KMS_MASTER_KEY are loaded by Next from .env.local.
    },
  },
});
