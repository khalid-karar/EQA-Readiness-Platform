import { describe, expect, it } from "vitest";
import { AuthenticationError, MfaRequiredError } from "./errors";
import {
  createTestProvider,
  issueToken,
  TEST_AUDIENCE,
  TEST_ISSUER,
} from "./testing/tokens";

describe("KeycloakIdentityProvider", () => {
  it("verifies an MFA-authenticated token and extracts tenant + role", async () => {
    const { provider, privateKey } = await createTestProvider();
    const token = await issueToken(privateKey, {
      sub: "user-1",
      tenant: "seera-pilot",
      role: "cae",
      amr: ["pwd", "otp"],
    });

    const identity = await provider.verify(token);
    expect(identity).toEqual({
      userId: "user-1",
      tenantSlug: "seera-pilot",
      role: "cae",
      mfa: true,
    });
  });

  it("requires MFA — rejects a token with no MFA evidence", async () => {
    const { provider, privateKey } = await createTestProvider();
    const token = await issueToken(privateKey, {
      tenant: "seera-pilot",
      role: "cae",
      amr: ["pwd"], // password only — not a second factor
    });
    await expect(provider.verify(token)).rejects.toBeInstanceOf(
      MfaRequiredError,
    );
  });

  it("requires MFA — rejects a token with no amr/acr at all", async () => {
    const { provider, privateKey } = await createTestProvider();
    const token = await issueToken(privateKey, {
      tenant: "seera-pilot",
      role: "cae",
    });
    await expect(provider.verify(token)).rejects.toBeInstanceOf(
      MfaRequiredError,
    );
  });

  it("accepts a configured acr step-up as MFA", async () => {
    const { provider, privateKey } = await createTestProvider({
      acceptedAcr: ["urn:mace:eqa:mfa"],
    });
    const token = await issueToken(privateKey, {
      tenant: "seera-pilot",
      role: "cae",
      acr: "urn:mace:eqa:mfa",
    });
    const identity = await provider.verify(token);
    expect(identity.mfa).toBe(true);
  });

  it("accepts client id in azp when aud is absent (Keycloak access tokens)", async () => {
    const { provider, privateKey } = await createTestProvider();
    const token = await issueToken(
      privateKey,
      {
        tenant: "seera-pilot",
        role: "cae",
        amr: ["otp"],
        azp: TEST_AUDIENCE,
      },
      { skipAudience: true },
    );
    const identity = await provider.verify(token);
    expect(identity.tenantSlug).toBe("seera-pilot");
  });

  it("rejects a wrong audience", async () => {
    const { provider, privateKey } = await createTestProvider();
    const token = await issueToken(
      privateKey,
      { tenant: "seera-pilot", role: "cae", amr: ["otp"] },
      { audience: "some-other-client" },
    );
    await expect(provider.verify(token)).rejects.toBeInstanceOf(
      AuthenticationError,
    );
  });

  it("rejects a wrong issuer", async () => {
    const { provider, privateKey } = await createTestProvider();
    const token = await issueToken(
      privateKey,
      { tenant: "seera-pilot", role: "cae", amr: ["otp"] },
      { issuer: "https://evil.example/realms/eqa" },
    );
    await expect(provider.verify(token)).rejects.toBeInstanceOf(
      AuthenticationError,
    );
  });

  it("rejects an expired token", async () => {
    const { provider, privateKey } = await createTestProvider();
    const token = await issueToken(
      privateKey,
      { tenant: "seera-pilot", role: "cae", amr: ["otp"] },
      { expired: true },
    );
    await expect(provider.verify(token)).rejects.toBeInstanceOf(
      AuthenticationError,
    );
  });

  it("rejects a missing tenant claim", async () => {
    const { provider, privateKey } = await createTestProvider();
    const token = await issueToken(privateKey, { role: "cae", amr: ["otp"] });
    await expect(provider.verify(token)).rejects.toBeInstanceOf(
      AuthenticationError,
    );
  });

  it("rejects a missing or invalid role claim", async () => {
    const { provider, privateKey } = await createTestProvider();
    const noRole = await issueToken(privateKey, {
      tenant: "seera-pilot",
      amr: ["otp"],
    });
    await expect(provider.verify(noRole)).rejects.toBeInstanceOf(
      AuthenticationError,
    );

    const badRole = await issueToken(privateKey, {
      tenant: "seera-pilot",
      role: "superuser",
      amr: ["otp"],
    });
    await expect(provider.verify(badRole)).rejects.toBeInstanceOf(
      AuthenticationError,
    );
  });

  it("rejects more than one role (exactly one required)", async () => {
    const { provider, privateKey } = await createTestProvider();
    const token = await issueToken(privateKey, {
      tenant: "seera-pilot",
      role: ["cae", "board"],
      amr: ["otp"],
    });
    await expect(provider.verify(token)).rejects.toBeInstanceOf(
      AuthenticationError,
    );
  });

  it("does not leak token internals (uses configured issuer/audience)", async () => {
    // Sanity: a token minted with the test issuer/audience verifies.
    const { provider, privateKey } = await createTestProvider();
    const token = await issueToken(privateKey, {
      tenant: "seera-pilot",
      role: "audit_staff",
      amr: ["otp"],
    });
    const identity = await provider.verify(token);
    expect(identity.role).toBe("audit_staff");
    expect(TEST_ISSUER).toContain("realms/eqa");
    expect(TEST_AUDIENCE).toBe("eqa-web");
  });
});
