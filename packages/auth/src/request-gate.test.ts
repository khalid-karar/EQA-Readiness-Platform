import type { TenantDescriptor, TenantDirectory } from "@eqa/tenant";
import { isPublicRoute } from "@eqa/tenant";
import { beforeEach, describe, expect, it } from "vitest";
import { evaluateRequestGate } from "./request-gate";
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

async function handlerWouldRun(
  pathname: string,
  headers: Record<string, string>,
  gateProvider: Awaited<ReturnType<typeof createTestProvider>>["provider"],
): Promise<boolean> {
  const outcome = await evaluateRequestGate(
    pathname,
    headers,
    gateProvider,
    directory,
  );
  return outcome.allowed;
}

describe("evaluateRequestGate — central tenant rejection (standing rule 7)", () => {
  let provider: Awaited<ReturnType<typeof createTestProvider>>["provider"];
  let privateKey: Awaited<ReturnType<typeof createTestProvider>>["privateKey"];

  beforeEach(async () => {
    const test = await createTestProvider();
    provider = test.provider;
    privateKey = test.privateKey;
  });

  it("allows public routes without authentication or tenant context", async () => {
    const outcome = await evaluateRequestGate(
      "/health",
      {},
      provider,
      directory,
    );
    expect(outcome).toEqual({ allowed: true, kind: "public" });
    expect(await handlerWouldRun("/dashboard", {}, provider)).toBe(false);
    expect(await handlerWouldRun("/api/evidence-pack/sample", {}, provider)).toBe(
      false,
    );
  });

  it("rejects tenant-scoped routes with no credential before a handler can run", async () => {
    const outcome = await evaluateRequestGate(
      "/assessments",
      {},
      provider,
      directory,
    );
    expect(outcome).toEqual({
      allowed: false,
      status: 401,
      error: "authentication_required",
    });
    expect(await handlerWouldRun("/assessments", {}, provider)).toBe(false);
  });

  it("rejects tenant-scoped routes when the token omits a tenant claim", async () => {
    const token = await issueToken(privateKey, {
      role: "cae",
      amr: ["otp"],
    });
    const outcome = await evaluateRequestGate(
      "/assessments",
      { authorization: `Bearer ${token}` },
      provider,
      directory,
    );
    expect(outcome.allowed).toBe(false);
    expect(outcome).toMatchObject({
      status: 401,
      error: "authentication_required",
    });
    expect(
      await handlerWouldRun("/assessments", {
        authorization: `Bearer ${token}`,
      }, provider),
    ).toBe(false);
  });

  it("rejects tenant-scoped routes when the token tenant is unknown or inactive", async () => {
    const ghost = await issueToken(privateKey, {
      tenant: "ghost-co",
      role: "cae",
      amr: ["otp"],
    });
    const suspended = await issueToken(privateKey, {
      tenant: "gone-co",
      role: "cae",
      amr: ["otp"],
    });

    const ghostOutcome = await evaluateRequestGate(
      "/assessments",
      { authorization: `Bearer ${ghost}` },
      provider,
      directory,
    );
    expect(ghostOutcome).toMatchObject({
      allowed: false,
      status: 401,
      error: "authentication_required",
    });

    const suspendedOutcome = await evaluateRequestGate(
      "/assessments",
      { authorization: `Bearer ${suspended}` },
      provider,
      directory,
    );
    expect(suspendedOutcome).toMatchObject({
      allowed: false,
      status: 401,
      error: "authentication_required",
    });

    expect(
      await handlerWouldRun("/assessments", {
        authorization: `Bearer ${ghost}`,
      }, provider),
    ).toBe(false);
    expect(
      await handlerWouldRun("/assessments", {
        authorization: `Bearer ${suspended}`,
      }, provider),
    ).toBe(false);
  });

  it("allows tenant-scoped routes only after token tenant resolves to an active tenant", async () => {
    const token = await issueToken(privateKey, {
      tenant: "alpha-co",
      role: "cae",
      amr: ["otp"],
    });
    const outcome = await evaluateRequestGate(
      "/assessments",
      { authorization: `Bearer ${token}` },
      provider,
      directory,
    );
    expect(outcome.allowed).toBe(true);
    if (!outcome.allowed || outcome.kind !== "tenant") {
      throw new Error("expected tenant outcome");
    }
    expect(outcome.session.tenant.slug).toBe("alpha-co");
    expect(outcome.context.schemaName).toBe("tenant_alpha_co");
    expect(
      await handlerWouldRun("/assessments", {
        authorization: `Bearer ${token}`,
      }, provider),
    ).toBe(true);
  });

  it("ignores forged tenant headers — binding stays on the token claim", async () => {
    const token = await issueToken(privateKey, {
      tenant: "alpha-co",
      role: "cae",
      amr: ["otp"],
    });
    const outcome = await evaluateRequestGate(
      "/assessments",
      {
        authorization: `Bearer ${token}`,
        "x-tenant-slug": "gone-co",
      },
      provider,
      directory,
    );
    expect(outcome.allowed).toBe(true);
    if (!outcome.allowed || outcome.kind !== "tenant") {
      throw new Error("expected tenant outcome");
    }
    expect(outcome.session.tenant.slug).toBe("alpha-co");
  });

  it("rejects unknown paths not on the public allowlist by default (fail-closed)", async () => {
    const unknownPath = "/api/v2/new-protected-resource";
    expect(isPublicRoute(unknownPath)).toBe(false);
    const outcome = await evaluateRequestGate(
      unknownPath,
      {},
      provider,
      directory,
    );
    expect(outcome).toEqual({
      allowed: false,
      status: 401,
      error: "authentication_required",
    });
    expect(await handlerWouldRun(unknownPath, {}, provider)).toBe(false);
  });
});
