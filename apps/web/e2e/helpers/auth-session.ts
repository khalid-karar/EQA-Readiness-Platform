import type { Role } from "@eqa/auth";
import {
  issueToken,
  TEST_AUDIENCE,
  TEST_ISSUER,
} from "@eqa/auth/testing/tokens";
import type { OidcConfig } from "@/lib/auth/config";
import { encryptSession, SESSION_COOKIE } from "@/lib/auth/session-cookie";

const SESSION_SECRET =
  process.env.AUTH_SESSION_SECRET ??
  "e2e-test-session-secret-32-bytes-min";

function e2eOidcConfig(appUrl: string): OidcConfig {
  const normalized = appUrl.replace(/\/$/, "");
  return {
    issuer: TEST_ISSUER,
    clientId: TEST_AUDIENCE,
    clientSecret: "e2e-test-client-secret",
    appUrl: normalized,
    sessionSecret: SESSION_SECRET,
    authorizationEndpoint: `${TEST_ISSUER}/protocol/openid-connect/auth`,
    tokenEndpoint: `${TEST_ISSUER}/protocol/openid-connect/token`,
    logoutEndpoint: `${TEST_ISSUER}/protocol/openid-connect/logout`,
    redirectUri: `${normalized}/auth/callback`,
  };
}

/** Builds an encrypted session cookie for Playwright (EQA_E2E_TEST_AUTH mode). */
export async function buildE2eSessionCookie(
  role: Role = "cae",
  tenant = "seera-pilot",
  baseURL = process.env.PLAYWRIGHT_BASE_URL ??
    process.env.PLAYWRIGHT_REALDB_BASE_URL ??
    "http://127.0.0.1:3000",
): Promise<{
  name: string;
  value: string;
  url: string;
}> {
  const { getStaticTestProvider } = await import("@eqa/auth/testing/tokens");
  const { privateKey } = await getStaticTestProvider();
  const accessToken = await issueToken(privateKey, {
    tenant,
    role,
    amr: ["pwd", "otp"],
  });
  const sealed = await encryptSession(
    {
      accessToken,
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    },
    e2eOidcConfig(baseURL),
  );
  return {
    name: SESSION_COOKIE,
    value: sealed,
    url: baseURL,
  };
}
