/**
 * Provisions the pinned Chromium revision at install time.
 * Invoked by the @eqa/workflows postinstall script — not at PDF render time.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  install,
  Browser,
  computeExecutablePath,
  detectBrowserPlatform,
} from "@puppeteer/browsers";

const REVISION = "148.0.7778.97";
const CACHE_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  ".chromium-cache",
);

const platform = detectBrowserPlatform();
const executablePath = computeExecutablePath({
  browser: Browser.CHROME,
  buildId: REVISION,
  cacheDir: CACHE_DIR,
  platform,
});

if (existsSync(executablePath)) {
  console.log(
    `[eqa/workflows] Chromium ${REVISION} already provisioned: ${executablePath}`,
  );
  process.exit(0);
}

console.log(
  `[eqa/workflows] Provisioning pinned Chromium ${REVISION} for ${platform} → ${CACHE_DIR}`,
);

await install({
  browser: Browser.CHROME,
  buildId: REVISION,
  cacheDir: CACHE_DIR,
  platform,
});

mkdirSync(CACHE_DIR, { recursive: true });
writeFileSync(
  join(CACHE_DIR, `.provisioned-${REVISION}-${platform}`),
  executablePath,
);

console.log(`[eqa/workflows] Chromium ${REVISION} ready: ${executablePath}`);
