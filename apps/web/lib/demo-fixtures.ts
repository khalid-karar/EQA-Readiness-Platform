/** In-memory synthetic fixtures — dev/E2E only, never production default. */
export function isDemoFixturesEnabled(): boolean {
  return (
    process.env.EQA_UI_DEMO_FIXTURES === "true" ||
    process.env.EQA_DEV_VIEW_CONTROLS === "true" ||
    process.env.EQA_E2E_TEST_AUTH === "true"
  );
}
