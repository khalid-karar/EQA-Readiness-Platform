/**
 * Pinned Chromium revision for evidence-pack PDF rendering.
 *
 * Do not change without:
 * 1. Running `pnpm provision:chromium` (or `pnpm install`) to fetch the new binary.
 * 2. Regenerating `src/__fixtures__/visual-baselines/` PNGs (all pages, EN+AR).
 *
 * In-Kingdom production hosts must bake this exact revision into the deployment
 * image — see packages/workflows/CHROMIUM.md. Runtime must not download Chromium.
 */
export const PINNED_CHROMIUM_REVISION = "148.0.7778.97";

/** Puppeteer release paired with {@link PINNED_CHROMIUM_REVISION}. */
export const PINNED_PUPPETEER_VERSION = "24.43.1";
