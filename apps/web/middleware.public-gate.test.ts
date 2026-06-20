import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setTenantGateDependenciesForTests } from "./lib/tenant-gate";

describe("middleware — public short-circuit without Keycloak", () => {
  const envBackup = {
    issuer: process.env.KEYCLOAK_ISSUER,
    audience: process.env.KEYCLOAK_AUDIENCE,
  };

  beforeEach(() => {
    setTenantGateDependenciesForTests(undefined);
    delete process.env.KEYCLOAK_ISSUER;
    delete process.env.KEYCLOAK_AUDIENCE;
  });

  afterEach(() => {
    setTenantGateDependenciesForTests(undefined);
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
  });

  it("allows a public route when Keycloak env is unset", async () => {
    const { middleware } = await import("./middleware");
    const response = await middleware(
      new NextRequest(new URL("http://localhost/health")),
    );
    expect(response.status).toBe(200);
  });

  it("requires Keycloak env for tenant-scoped routes", async () => {
    const { middleware } = await import("./middleware");
    await expect(
      middleware(new NextRequest(new URL("http://localhost/assessments"))),
    ).rejects.toThrow(
      "KEYCLOAK_ISSUER and KEYCLOAK_AUDIENCE are required for tenant request gating.",
    );
  });
});
