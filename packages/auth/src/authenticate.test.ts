import type { TenantDescriptor, TenantDirectory } from "@eqa/tenant";
import { describe, expect, it } from "vitest";
import { authenticate, authenticateRequest } from "./authenticate";
import { AuthenticationError, MfaRequiredError } from "./errors";
import { createTestProvider, issueToken } from "./testing/tokens";

const tenants: TenantDescriptor[] = [
  {
    id: "t-alpha",
    slug: "alpha-co",
    name: "Alpha Co",
    schemaName: "tenant_alpha_co",
    status: "active",
  },
  {
    id: "t-beta",
    slug: "beta-co",
    name: "Beta Co",
    schemaName: "tenant_beta_co",
    status: "active",
  },
  {
    id: "t-suspended",
    slug: "gone-co",
    name: "Gone Co",
    schemaName: "tenant_gone_co",
    status: "suspended",
  },
];

const directory: TenantDirectory = {
  findBySlug: (slug) =>
    Promise.resolve(tenants.find((t) => t.slug === slug) ?? null),
};

describe("authenticate", () => {
  it("binds the tenant from the token and resolves its schema", async () => {
    const { provider, privateKey } = await createTestProvider();
    const token = await issueToken(privateKey, {
      sub: "user-7",
      tenant: "alpha-co",
      role: "cae",
      amr: ["otp"],
    });

    const session = await authenticate(token, provider, directory);
    expect(session.userId).toBe("user-7");
    expect(session.role).toBe("cae");
    expect(session.tenant).toEqual({
      tenantId: "t-alpha",
      slug: "alpha-co",
      name: "Alpha Co",
      schemaName: "tenant_alpha_co",
    });
    expect(session.mfaAuthenticated).toBe(true);
  });

  it("propagates MFA enforcement from the provider", async () => {
    const { provider, privateKey } = await createTestProvider();
    const token = await issueToken(privateKey, {
      tenant: "alpha-co",
      role: "cae",
      amr: ["pwd"],
    });
    await expect(
      authenticate(token, provider, directory),
    ).rejects.toBeInstanceOf(MfaRequiredError);
  });

  it("rejects an identity whose tenant is unknown or inactive", async () => {
    const { provider, privateKey } = await createTestProvider();
    const unknown = await issueToken(privateKey, {
      tenant: "ghost-co",
      role: "cae",
      amr: ["otp"],
    });
    await expect(
      authenticate(unknown, provider, directory),
    ).rejects.toBeInstanceOf(AuthenticationError);

    const suspended = await issueToken(privateKey, {
      tenant: "gone-co",
      role: "cae",
      amr: ["otp"],
    });
    await expect(
      authenticate(suspended, provider, directory),
    ).rejects.toBeInstanceOf(AuthenticationError);
  });
});

describe("authenticateRequest — forged tenant header is ignored", () => {
  it("derives the tenant from the token, not from x-tenant-* headers", async () => {
    const { provider, privateKey } = await createTestProvider();
    // Token is for alpha-co...
    const token = await issueToken(privateKey, {
      tenant: "alpha-co",
      role: "cae",
      amr: ["otp"],
    });

    // ...but the request also carries a forged header claiming beta-co.
    const headers = {
      authorization: `Bearer ${token}`,
      "x-tenant-slug": "beta-co",
      "x-tenant-id": "t-beta",
    };

    const session = await authenticateRequest(headers, provider, directory);
    expect(session.tenant.slug).toBe("alpha-co"); // header was ignored
    expect(session.tenant.tenantId).toBe("t-alpha");
  });

  it("works with a Headers-like object too", async () => {
    const { provider, privateKey } = await createTestProvider();
    const token = await issueToken(privateKey, {
      tenant: "beta-co",
      role: "board",
      amr: ["otp"],
    });
    const headers = new Headers({
      authorization: `Bearer ${token}`,
      "x-tenant-slug": "alpha-co",
    });
    const session = await authenticateRequest(headers, provider, directory);
    expect(session.tenant.slug).toBe("beta-co");
  });

  it("requires a Bearer Authorization header", async () => {
    const { provider } = await createTestProvider();
    await expect(
      authenticateRequest({}, provider, directory),
    ).rejects.toBeInstanceOf(AuthenticationError);
    await expect(
      authenticateRequest({ authorization: "Basic abc" }, provider, directory),
    ).rejects.toBeInstanceOf(AuthenticationError);
  });
});
