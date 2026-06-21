/**
 * Captures standards workspace screenshots (EN + AR).
 * Usage: start the web app with EQA_E2E_TEST_AUTH=true, then
 * `pnpm exec tsx tools/capture-standards-workspace-screenshots.ts`
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import puppeteer from "puppeteer";
import {
  issueToken,
  TEST_AUDIENCE,
  TEST_ISSUER,
} from "@eqa/auth/testing/tokens";
import type { OidcConfig } from "../apps/web/lib/auth/config";
import {
  encryptSession,
  SESSION_COOKIE,
} from "../apps/web/lib/auth/session-cookie";

const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? "http://127.0.0.1:3000";
const OUT_DIR = join(process.cwd(), "apps/web/docs/screenshots");

const E2E_CONFIG: OidcConfig = {
  issuer: TEST_ISSUER,
  clientId: TEST_AUDIENCE,
  clientSecret: "e2e-test-client-secret",
  appUrl: "http://127.0.0.1:3000",
  sessionSecret: "e2e-test-session-secret-32-bytes-min",
  authorizationEndpoint: `${TEST_ISSUER}/protocol/openid-connect/auth`,
  tokenEndpoint: `${TEST_ISSUER}/protocol/openid-connect/token`,
  logoutEndpoint: `${TEST_ISSUER}/protocol/openid-connect/logout`,
  redirectUri: "http://127.0.0.1:3000/auth/callback",
};

async function setE2eSessionCookie(
  page: import("puppeteer").Page,
): Promise<void> {
  const { getStaticTestProvider } = await import("@eqa/auth/testing/tokens");
  const { privateKey } = await getStaticTestProvider();
  const accessToken = await issueToken(privateKey, {
    tenant: "seera-pilot",
    role: "cae",
    amr: ["pwd", "otp"],
  });
  const sealed = await encryptSession(
    {
      accessToken,
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    },
    E2E_CONFIG,
  );
  await page.setCookie({
    name: SESSION_COOKIE,
    value: sealed,
    domain: "127.0.0.1",
    path: "/",
  });
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await setE2eSessionCookie(page);

    for (const { locale, suffix } of [
      { locale: "en", suffix: "en" },
      { locale: "ar", suffix: "ar" },
    ]) {
      const url = `${BASE_URL}/standards?locale=${locale}&role=cae`;
      await page.goto(url, { waitUntil: "networkidle0", timeout: 120_000 });
      await page.waitForSelector("h1", { timeout: 30_000 });
      const outPath = join(OUT_DIR, `standards-workspace-${suffix}.png`);
      await page.screenshot({ path: outPath, fullPage: true });
      console.log(`Wrote ${outPath}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
