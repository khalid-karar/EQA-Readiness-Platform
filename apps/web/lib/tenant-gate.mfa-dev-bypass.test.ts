import { describe, expect, it } from "vitest";
import { MfaRequiredError } from "@eqa/auth";
import { createTestProvider, issueToken } from "@eqa/auth/testing/tokens";
import { resolveAllowPasswordOnlyWithoutAmr } from "./tenant-gate";

const PROD_ISSUER =
  "https://keycloak-production-5969.up.railway.app/realms/eqa";
const LOCAL_ISSUER = "http://localhost:8080/realms/eqa";

async function verifyPasswordOnlyToken(
  allowPasswordOnlyWithoutAmr: boolean,
): Promise<void> {
  const { provider, privateKey } = await createTestProvider({
    allowPasswordOnlyWithoutAmr,
  });
  const token = await issueToken(privateKey, {
    tenant: "seera-pilot",
    role: "cae",
  });
  if (allowPasswordOnlyWithoutAmr) {
    const identity = await provider.verify(token);
    expect(identity.mfa).toBe(true);
  } else {
    await expect(provider.verify(token)).rejects.toBeInstanceOf(MfaRequiredError);
  }
}

describe("MFA dev bypass — strictly dev + localhost only", () => {
  it("(a) production + real issuer: bypass disabled and password-only token rejected", async () => {
    const allowBypass = resolveAllowPasswordOnlyWithoutAmr(
      PROD_ISSUER,
      "production",
    );
    expect(allowBypass).toBe(false);
    await verifyPasswordOnlyToken(allowBypass);
  });

  it("(b) production + localhost issuer: bypass still disabled and password-only token rejected", async () => {
    const allowBypass = resolveAllowPasswordOnlyWithoutAmr(
      LOCAL_ISSUER,
      "production",
    );
    expect(allowBypass).toBe(false);
    await verifyPasswordOnlyToken(allowBypass);
  });

  it("(c) non-production + localhost issuer: bypass enabled and password-only token accepted", async () => {
    const allowBypass = resolveAllowPasswordOnlyWithoutAmr(
      LOCAL_ISSUER,
      "development",
    );
    expect(allowBypass).toBe(true);
    await verifyPasswordOnlyToken(allowBypass);
  });

  it("non-production + real issuer: bypass disabled (localhost required)", async () => {
    const allowBypass = resolveAllowPasswordOnlyWithoutAmr(
      PROD_ISSUER,
      "development",
    );
    expect(allowBypass).toBe(false);
    await verifyPasswordOnlyToken(allowBypass);
  });
});
