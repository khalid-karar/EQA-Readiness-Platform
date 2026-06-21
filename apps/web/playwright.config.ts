import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PLAYWRIGHT_PORT ?? "3000";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // The tenant-isolation spec requires real Postgres (no demo fixtures) and runs
  // ONLY under playwright.realdb.config.ts. Keep it out of the fixture suite.
  testIgnore: ["**/tenant-isolation.spec.ts"],
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  outputDir: "test-results",
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
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: {
      KEYCLOAK_ISSUER: "https://keycloak.test/realms/eqa",
      KEYCLOAK_AUDIENCE: "eqa-web",
      KEYCLOAK_CLIENT_SECRET: "e2e-test-client-secret",
      AUTH_SESSION_SECRET: "e2e-test-session-secret-32-bytes-min",
      EQA_E2E_TEST_AUTH: "true",
      EQA_UI_DEMO_FIXTURES: "true",
      TENANT_ALLOWLIST: "seera-pilot,beta-co",
      PORT: String(PORT),
      NODE_ENV: "production",
    },
  },
});
