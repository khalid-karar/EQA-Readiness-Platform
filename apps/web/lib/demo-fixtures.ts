/**
 * In-memory synthetic fixtures — dev/E2E only, never production default.
 *
 * Gated ONLY on explicit demo flags. Test auth (`EQA_E2E_TEST_AUTH`) is
 * intentionally NOT a trigger: a test-auth server with `DATABASE_URL` set reads
 * real tenant-scoped Postgres, which the real-DB isolation e2e relies on.
 */
export function isDemoFixturesEnabled(): boolean {
  return (
    process.env.EQA_UI_DEMO_FIXTURES === "true" ||
    process.env.EQA_DEV_VIEW_CONTROLS === "true"
  );
}
