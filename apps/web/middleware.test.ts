import { evaluateRequestGate } from "@eqa/auth";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { middleware, config } from "./middleware";

vi.mock("@eqa/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@eqa/auth")>();
  return {
    ...actual,
    evaluateRequestGate: vi.fn(),
  };
});

vi.mock("./lib/tenant-gate", () => ({
  getTenantGateDependencies: () => ({
    provider: { verify: vi.fn() },
    directory: { findBySlug: vi.fn() },
  }),
  setTenantGateDependenciesForTests: vi.fn(),
}));

const gate = vi.mocked(evaluateRequestGate);

/** Mirrors Next.js middleware matcher: runs on all paths except static assets. */
function middlewareMatcherMatches(pathname: string): boolean {
  const pattern = config.matcher[0];
  const re = new RegExp(`^${pattern}$`);
  return re.test(pathname);
}

describe("middleware config — matcher coverage", () => {
  it("runs tenant gate on tenant-scoped and unknown app routes (fail-closed default)", () => {
    expect(middlewareMatcherMatches("/assessments")).toBe(true);
    expect(middlewareMatcherMatches("/api/v2/new-protected-resource")).toBe(true);
    expect(middlewareMatcherMatches("/api/tenants/x")).toBe(true);
  });

  it("skips only static asset paths", () => {
    expect(middlewareMatcherMatches("/_next/static/chunk.js")).toBe(false);
    expect(middlewareMatcherMatches("/_next/image/logo")).toBe(false);
    expect(middlewareMatcherMatches("/favicon.ico")).toBe(false);
  });
});

describe("middleware — tenant gate at the edge", () => {
  beforeEach(() => {
    gate.mockReset();
  });

  it("short-circuits public routes without calling the tenant gate", async () => {
    const response = await middleware(
      new NextRequest(new URL("http://localhost/health")),
    );
    expect(response.status).toBe(200);
    expect(gate).not.toHaveBeenCalled();
  });

  it("returns a central rejection before handlers when tenant context is missing", async () => {
    gate.mockResolvedValue({
      allowed: false,
      status: 401,
      error: "authentication_required",
    });
    const response = await middleware(
      new NextRequest(new URL("http://localhost/assessments")),
    );
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toMatchObject({
      error: "authentication_required",
      path: "/assessments",
    });
  });

  it("does not call NextResponse.next when the gate rejects an invalid tenant", async () => {
    gate.mockResolvedValue({
      allowed: false,
      status: 403,
      error: "tenant_not_resolved",
    });
    const response = await middleware(
      new NextRequest(new URL("http://localhost/assessments")),
    );
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("tenant_not_resolved");
  });

  it("forwards tenant-scoped routes only when the gate resolves tenant context", async () => {
    gate.mockResolvedValue({
      allowed: true,
      kind: "tenant",
      session: {
        userId: "user-1",
        role: "cae",
        mfaAuthenticated: true,
        tenant: {
          tenantId: "t-alpha",
          slug: "alpha-co",
          name: "Alpha Co",
          schemaName: "tenant_alpha_co",
        },
      },
      context: {
        tenantId: "t-alpha",
        slug: "alpha-co",
        name: "Alpha Co",
        schemaName: "tenant_alpha_co",
      },
    });
    const response = await middleware(
      new NextRequest(new URL("http://localhost/assessments"), {
        headers: { authorization: "Bearer token" },
      }),
    );
    expect(response.status).toBe(200);
  });

  it("rejects unknown protected paths at the edge before handlers run", async () => {
    const unknownPath = "/api/v2/new-protected-resource";
    gate.mockResolvedValue({
      allowed: false,
      status: 401,
      error: "authentication_required",
    });
    const response = await middleware(
      new NextRequest(new URL(`http://localhost${unknownPath}`)),
    );
    expect(gate).toHaveBeenCalledWith(
      unknownPath,
      expect.any(Headers),
      expect.anything(),
      expect.anything(),
    );
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toMatchObject({
      error: "authentication_required",
      path: unknownPath,
    });
  });
});
