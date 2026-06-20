import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Browser,
  computeExecutablePath,
  detectBrowserPlatform,
} from "@puppeteer/browsers";
import { PINNED_CHROMIUM_REVISION } from "./evidence-pack-chromium-pin";

const WORKFLOWS_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const DEFAULT_CACHE_DIR = join(WORKFLOWS_ROOT, ".chromium-cache");

/**
 * Resolves the pinned Chromium executable. Fails fast when the binary was not
 * provisioned at install/image-build time (no runtime download).
 *
 * Override for in-Kingdom images:
 * - `EQA_CHROMIUM_EXECUTABLE` — absolute path to the baked `chrome` binary.
 * - `EQA_CHROMIUM_CACHE_DIR` — directory containing the puppeteer cache layout
 *   for {@link PINNED_CHROMIUM_REVISION} (default: `packages/workflows/.chromium-cache`).
 */
export function resolvePinnedChromiumExecutable(): string {
  const override = process.env.EQA_CHROMIUM_EXECUTABLE?.trim();
  if (override) {
    if (!existsSync(override)) {
      throw new Error(
        `EQA_CHROMIUM_EXECUTABLE points to a missing file: ${override}. ` +
          `Bake Chromium ${PINNED_CHROMIUM_REVISION} into the in-Kingdom host image.`,
      );
    }
    return override;
  }

  const cacheDir =
    process.env.EQA_CHROMIUM_CACHE_DIR?.trim() || DEFAULT_CACHE_DIR;
  const platform = detectBrowserPlatform();
  if (!platform) {
    throw new Error(
      "Cannot resolve Chromium platform for this host. Bake Chromium " +
        `${PINNED_CHROMIUM_REVISION} into the in-Kingdom image.`,
    );
  }

  const executablePath = computeExecutablePath({
    browser: Browser.CHROME,
    buildId: PINNED_CHROMIUM_REVISION,
    cacheDir,
    platform,
  });

  if (!existsSync(executablePath)) {
    throw new Error(
      `Pinned Chromium ${PINNED_CHROMIUM_REVISION} is not provisioned at ${executablePath}. ` +
        `Run pnpm install (postinstall provisions Chromium) or bake revision ` +
        `${PINNED_CHROMIUM_REVISION} into the in-Kingdom host image ` +
        `(see packages/workflows/CHROMIUM.md).`,
    );
  }

  return executablePath;
}

export function chromiumCacheDirectory(): string {
  return process.env.EQA_CHROMIUM_CACHE_DIR?.trim() || DEFAULT_CACHE_DIR;
}
