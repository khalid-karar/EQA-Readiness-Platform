import type { KeyLike } from "jose";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  issueToken,
  TEST_AUDIENCE,
  TEST_ISSUER,
} from "@eqa/auth/testing/tokens";
import {
  createAllowlistTenantDirectoryFromSlugs,
} from "@eqa/tenant";
import type { OidcConfig } from "./config";
import { encryptSession, SESSION_COOKIE } from "./session-cookie";
import { resetE2eIdentityProviderForTests } from "./resolve-provider";

const refreshAccessToken = vi.hoisted(() => vi.fn());

vi.mock("./oidc", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./oidc")>();
  return { ...actual, refreshAccessToken };
});

const SESSION_SECRET = "test-session-secret-at-least-32-bytes-long";
const TEST_CONFIG: OidcConfig = {
  issuer: TEST_ISSUER,
  clientId: TEST_AUDIENCE,
  clientSecret: "test-client-secret",
  appUrl: "http://localhost:3000",
  sessionSecret: SESSION_SECRET,
  authorizationEndpoint: `${TEST_ISSUER}/protocol/openid-connect/auth`,
  tokenEndpoint: `${TEST_ISSUER}/protocol/openid-connect/token`,
  logoutEndpoint: `${TEST_ISSUER}/protocol/openid-connect/logout`,
  redirectUri: "http://localhost:3000/auth/callback",
};

describe("session cookie", () => {
  it("round-trips an encrypted session payload", async () => {
    const { encryptSession: enc, decryptSession } = await import(
      "./session-cookie"
    );
    const sealed = await enc(
      {
        accessToken: "token-abc",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      },
      TEST_CONFIG,
    );
    const payload = await decryptSession(sealed, TEST_CONFIG);
    expect(payload?.accessToken).toBe("token-abc");
  });
});

describe("middleware — OIDC session auth", () => {
  const envBackup = {
    issuer: process.env.KEYCLOAK_ISSUER,
    audience: process.env.KEYCLOAK_AUDIENCE,
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
    sessionSecret: process.env.AUTH_SESSION_SECRET,
    e2e: process.env.EQA_E2E_TEST_AUTH,
  };

  let testPrivateKey: KeyLike;

  beforeEach(async () => {
    refreshAccessToken.mockReset();
    process.env.KEYCLOAK_ISSUER = TEST_ISSUER;
    process.env.KEYCLOAK_AUDIENCE = TEST_AUDIENCE;
    process.env.KEYCLOAK_CLIENT_SECRET = "test-client-secret";
    process.env.AUTH_SESSION_SECRET = SESSION_SECRET;

    const { createTestProvider: createProvider } = await import(
      "@eqa/auth/testing/tokens"
    );
    const { provider, privateKey } = await createProvider();
    testPrivateKey = privateKey;
    const { setTenantGateDependenciesForTests } = await import(
      "@/lib/tenant-gate"
    );
    setTenantGateDependenciesForTests({
      provider,
      directory: createAllowlistTenantDirectoryFromSlugs(["seera-pilot"]),
    });
    resetE2eIdentityProviderForTests();
  });

  afterEach(async () => {
    const { setTenantGateDependenciesForTests } = await import(
      "@/lib/tenant-gate"
    );
    setTenantGateDependenciesForTests(undefined);
    resetE2eIdentityProviderForTests();

    if (envBackup.issuer !== undefined) {
      process.env.KEYCLOAK_ISSUER = envBackup.issuer;
    } else {
      delete process.env.KEYCLOAK_ISSUER;
    }
    if (envBackup.audience !== undefined) {
      process.env.KEYCLOAK_AUDIENCE = envBackup.audience;
    } else {
      delete process.env.KEYCLOAK_AUDIENCE;
    }
    if (envBackup.clientSecret !== undefined) {
      process.env.KEYCLOAK_CLIENT_SECRET = envBackup.clientSecret;
    } else {
      delete process.env.KEYCLOAK_CLIENT_SECRET;
    }
    if (envBackup.sessionSecret !== undefined) {
      process.env.AUTH_SESSION_SECRET = envBackup.sessionSecret;
    } else {
      delete process.env.AUTH_SESSION_SECRET;
    }
    if (envBackup.e2e !== undefined) {
      process.env.EQA_E2E_TEST_AUTH = envBackup.e2e;
    } else {
      delete process.env.EQA_E2E_TEST_AUTH;
    }
  });

  async function sealAccessToken(
    claims: {
      tenant?: string;
      role?: string;
      amr?: readonly string[];
      expired?: boolean;
    } = {},
  ): Promise<string> {
    const token = await issueToken(
      testPrivateKey,
      {
        tenant: claims.tenant ?? "seera-pilot",
        role: claims.role ?? "cae",
        amr: claims.amr ?? ["pwd", "otp"],
      },
      { expired: claims.expired ?? false },
    );
    return encryptSession(
      {
        accessToken: token,
        expiresAt: claims.expired
          ? Math.floor(Date.now() / 1000) - 60
          : Math.floor(Date.now() / 1000) + 3600,
      },
      TEST_CONFIG,
    );
  }

  it("redirects unauthenticated HTML navigations to login", async () => {
    const { middleware } = await import("@/middleware");
    const response = await middleware(
      new NextRequest(new URL("http://localhost/dashboard")),
    );
    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/auth/login");
    expect(location).toContain("returnTo=%2Fdashboard");
  });

  it("allows a valid session and binds role/tenant from the token", async () => {
    const sealed = await sealAccessToken({
      tenant: "seera-pilot",
      role: "audit_staff",
    });
    const { middleware } = await import("@/middleware");
    const request = new NextRequest(new URL("http://localhost/dashboard"));
    request.cookies.set(SESSION_COOKIE, sealed);
    const response = await middleware(request);
    expect(response.status).toBe(200);
  });

  it("redirects expired sessions to login for re-authentication", async () => {
    const sealed = await sealAccessToken({ expired: true });
    const { middleware } = await import("@/middleware");
    const request = new NextRequest(new URL("http://localhost/dashboard"));
    request.cookies.set(SESSION_COOKIE, sealed);
    const response = await middleware(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/auth/login");
  });

  it("refreshes an expired access token when a refresh token is present", async () => {
    const expiredToken = await issueToken(
      testPrivateKey,
      { tenant: "seera-pilot", role: "cae", amr: ["pwd", "otp"] },
      { expired: true },
    );
    const freshToken = await issueToken(
      testPrivateKey,
      { tenant: "seera-pilot", role: "cae", amr: ["pwd", "otp"] },
    );
    const sealed = await encryptSession(
      {
        accessToken: expiredToken,
        refreshToken: "refresh-token-abc",
        expiresAt: Math.floor(Date.now() / 1000) - 60,
      },
      TEST_CONFIG,
    );

    refreshAccessToken.mockResolvedValue({
      access_token: freshToken,
      expires_in: 3600,
      token_type: "Bearer",
    });

    const { middleware } = await import("@/middleware");
    const request = new NextRequest(
      new URL("http://localhost/api/actions/human-review"),
      { method: "POST" },
    );
    request.cookies.set(SESSION_COOKIE, sealed);
    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(refreshAccessToken).toHaveBeenCalled();
    expect(response.cookies.get(SESSION_COOKIE)?.value).toBeTruthy();
    expect(response.cookies.get(SESSION_COOKIE)?.value).not.toBe(sealed);
  });

  it("returns 401 JSON for unauthenticated API routes", async () => {
    const { middleware } = await import("@/middleware");
    const response = await middleware(
      new NextRequest(new URL("http://localhost/api/evidence-pack/sample")),
    );
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("authentication_required");
  });

  it("allows a valid session on /working-papers", async () => {
    const sealed = await sealAccessToken({
      tenant: "seera-pilot",
      role: "cae",
    });
    const { middleware } = await import("@/middleware");
    const request = new NextRequest(new URL("http://localhost/working-papers"));
    request.cookies.set(SESSION_COOKIE, sealed);
    const response = await middleware(request);
    expect(response.status).toBe(200);
  });

  it("allows a valid session on record-conformance API", async () => {
    const sealed = await sealAccessToken({
      tenant: "seera-pilot",
      role: "cae",
    });
    const { middleware } = await import("@/middleware");
    const request = new NextRequest(
      new URL("http://localhost/api/actions/record-conformance"),
      { method: "POST" },
    );
    request.cookies.set(SESSION_COOKIE, sealed);
    const response = await middleware(request);
    expect(response.status).toBe(200);
  });
});
