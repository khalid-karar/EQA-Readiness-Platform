/** Dev-only UI toggles (View as / locale). Off in production unless explicitly enabled. */
export function isDevViewControlsEnabled(): boolean {
  return process.env.EQA_DEV_VIEW_CONTROLS === "true";
}
