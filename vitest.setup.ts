/**
 * Vitest global setup — isolate the suite from leaked shell env (e.g. after
 * `next start` with EQA_E2E_TEST_AUTH or NODE_ENV=production). Individual tests
 * that need these variables set them in beforeEach and restore in afterEach.
 */
process.env.NODE_ENV = "test";

for (const key of [
  "EQA_E2E_TEST_AUTH",
  "KEYCLOAK_ISSUER",
  "KEYCLOAK_AUDIENCE",
  "KEYCLOAK_CLIENT_SECRET",
] as const) {
  delete process.env[key];
}
