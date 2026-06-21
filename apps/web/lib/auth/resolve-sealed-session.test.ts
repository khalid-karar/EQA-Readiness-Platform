import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OidcConfig } from "./config";

const refreshAccessToken = vi.fn();

vi.mock("./oidc", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./oidc")>();
  return {
    ...actual,
    refreshAccessToken,
  };
});

const TEST_CONFIG: OidcConfig = {
  issuer: "https://auth.test/realms/eqa",
  clientId: "eqa-web",
  clientSecret: "test-client-secret",
  appUrl: "http://localhost:3000",
  sessionSecret: "test-session-secret-at-least-32-bytes-long",
  authorizationEndpoint: "https://auth.test/realms/eqa/protocol/openid-connect/auth",
  tokenEndpoint: "https://auth.test/realms/eqa/protocol/openid-connect/token",
  logoutEndpoint: "https://auth.test/realms/eqa/protocol/openid-connect/logout",
  redirectUri: "http://localhost:3000/auth/callback",
};

describe("resolveSealedSession", () => {
  const envBackup = {
    issuer: process.env.KEYCLOAK_ISSUER,
    audience: process.env.KEYCLOAK_AUDIENCE,
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
    sessionSecret: process.env.AUTH_SESSION_SECRET,
    appUrl: process.env.APP_URL,
  };

  beforeEach(() => {
    refreshAccessToken.mockReset();
    process.env.KEYCLOAK_ISSUER = TEST_CONFIG.issuer;
    process.env.KEYCLOAK_AUDIENCE = TEST_CONFIG.clientId;
    process.env.KEYCLOAK_CLIENT_SECRET = TEST_CONFIG.clientSecret;
    process.env.AUTH_SESSION_SECRET = TEST_CONFIG.sessionSecret;
    process.env.APP_URL = TEST_CONFIG.appUrl;
  });

  afterEach(() => {
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
    if (envBackup.appUrl !== undefined) {
      process.env.APP_URL = envBackup.appUrl;
    } else {
      delete process.env.APP_URL;
    }
  });

  it("returns a valid session without refreshing when the access token is still valid", async () => {
    const { encryptSession } = await import("./session-cookie");
    const { resolveSealedSession } = await import("./resolve-sealed-session");
    const sealed = await encryptSession(
      {
        accessToken: "valid-token",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      },
      TEST_CONFIG,
    );

    const resolved = await resolveSealedSession(sealed);

    expect(resolved?.payload.accessToken).toBe("valid-token");
    expect(resolved?.refreshed).toBe(false);
    expect(resolved?.sealed).toBe(sealed);
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });

  it("refreshes an expired access token when a refresh token is present", async () => {
    const { encryptSession, decryptSession } = await import("./session-cookie");
    const { resolveSealedSession } = await import("./resolve-sealed-session");
    const sealed = await encryptSession(
      {
        accessToken: "expired-token",
        refreshToken: "refresh-abc",
        expiresAt: Math.floor(Date.now() / 1000) - 60,
      },
      TEST_CONFIG,
    );

    refreshAccessToken.mockResolvedValue({
      access_token: "fresh-token",
      expires_in: 3600,
      token_type: "Bearer",
      refresh_token: "refresh-xyz",
    });

    const resolved = await resolveSealedSession(sealed);

    expect(refreshAccessToken).toHaveBeenCalledWith(TEST_CONFIG, "refresh-abc");
    expect(resolved?.refreshed).toBe(true);
    expect(resolved?.payload.accessToken).toBe("fresh-token");
    expect(resolved?.payload.refreshToken).toBe("refresh-xyz");
    expect(resolved?.sealed).not.toBe(sealed);

    const decrypted = await decryptSession(resolved!.sealed, TEST_CONFIG);
    expect(decrypted?.accessToken).toBe("fresh-token");
  });

  it("returns null for an expired session without a refresh token", async () => {
    const { encryptSession } = await import("./session-cookie");
    const { resolveSealedSession } = await import("./resolve-sealed-session");
    const sealed = await encryptSession(
      {
        accessToken: "expired-token",
        expiresAt: Math.floor(Date.now() / 1000) - 60,
      },
      TEST_CONFIG,
    );

    const resolved = await resolveSealedSession(sealed);

    expect(resolved).toBeNull();
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });
});
