import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const configDir = dirname(fileURLToPath(import.meta.url));

function loadDotEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) {
    return {};
  }
  const vars: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
    vars[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return vars;
}

const envLocal = loadDotEnvFile(resolve(configDir, ".env.local"));
const databaseUrl = process.env.DATABASE_URL ?? envLocal.DATABASE_URL;
const kmsMasterKey = process.env.KMS_MASTER_KEY ?? envLocal.KMS_MASTER_KEY;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required for test:e2e:realdb — set it in apps/web/.env.local or the shell environment.",
  );
}
if (!kmsMasterKey) {
  throw new Error(
    "KMS_MASTER_KEY is required for test:e2e:realdb — set it in apps/web/.env.local or the shell environment.",
  );
}

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
      EQA_UI_DEMO_FIXTURES: "false",
      EQA_DEV_VIEW_CONTROLS: "false",
      TENANT_ALLOWLIST: "seera-pilot,beta-co",
      PORT: String(PORT),
      NODE_ENV: "production",
      DATABASE_URL: databaseUrl,
      KMS_MASTER_KEY: kmsMasterKey,
      // NOTE: EQA_UI_DEMO_FIXTURES is intentionally NOT set here.
    },
  },
});
