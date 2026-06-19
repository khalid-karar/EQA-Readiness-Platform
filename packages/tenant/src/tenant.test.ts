import { describe, expect, it } from "vitest";
import { requireTenant } from "./context";
import type { TenantDescriptor, TenantDirectory } from "./directory";
import { MissingTenantContextError, TenantNotResolvedError } from "./errors";
import { isPublicRoute } from "./public-routes";
import { resolveTenantContext } from "./resolve";
import { isValidIdentifier, tenantSchemaName } from "./schema";

const seera: TenantDescriptor = {
  id: "00000000-0000-0000-0000-000000000001",
  slug: "seera-pilot",
  name: "Seera-pilot",
  schemaName: "tenant_seera_pilot",
  status: "active",
};

function directoryWith(...tenants: TenantDescriptor[]): TenantDirectory {
  return {
    findBySlug: (slug) =>
      Promise.resolve(tenants.find((t) => t.slug === slug) ?? null),
  };
}

describe("public-route allowlist", () => {
  it.each(["/", "/health", "/api/health", "/auth", "/auth/sign-in"])(
    "treats %s as public",
    (path) => {
      expect(isPublicRoute(path)).toBe(true);
    },
  );

  it.each(["/assessments", "/api/tenants/x", "/dashboard"])(
    "treats %s as tenant-scoped",
    (path) => {
      expect(isPublicRoute(path)).toBe(false);
    },
  );
});

describe("schema naming", () => {
  it("derives a safe schema name from a slug", () => {
    expect(tenantSchemaName("seera-pilot")).toBe("tenant_seera_pilot");
    expect(tenantSchemaName("ACME Test 1")).toBe("tenant_acme_test_1");
  });

  it("validates identifiers", () => {
    expect(isValidIdentifier("tenant_seera_pilot")).toBe(true);
    expect(isValidIdentifier("tenant-bad")).toBe(false);
    expect(isValidIdentifier('x"; drop schema')).toBe(false);
  });
});

describe("resolveTenantContext", () => {
  it("resolves public routes without needing a tenant", async () => {
    const result = await resolveTenantContext(
      { pathname: "/health" },
      directoryWith(),
    );
    expect(result.kind).toBe("public");
  });

  it("resolves an active tenant on a scoped route", async () => {
    const result = await resolveTenantContext(
      { pathname: "/dashboard", tenantSlug: "seera-pilot" },
      directoryWith(seera),
    );
    expect(result).toEqual({
      kind: "tenant",
      context: {
        tenantId: seera.id,
        slug: seera.slug,
        name: seera.name,
        schemaName: seera.schemaName,
      },
    });
  });

  it("throws when a scoped route carries no tenant identifier", async () => {
    await expect(
      resolveTenantContext({ pathname: "/dashboard" }, directoryWith(seera)),
    ).rejects.toBeInstanceOf(TenantNotResolvedError);
  });

  it("throws for an unknown tenant", async () => {
    await expect(
      resolveTenantContext(
        { pathname: "/dashboard", tenantSlug: "ghost" },
        directoryWith(seera),
      ),
    ).rejects.toBeInstanceOf(TenantNotResolvedError);
  });
});

describe("requireTenant", () => {
  it("throws MissingTenantContextError when absent", () => {
    expect(() => requireTenant(null)).toThrow(MissingTenantContextError);
  });

  it("returns the context when present", () => {
    const ctx = {
      tenantId: seera.id,
      slug: seera.slug,
      name: seera.name,
      schemaName: seera.schemaName,
    };
    expect(requireTenant(ctx)).toBe(ctx);
  });
});
