import type { TenantContext } from "@eqa/tenant";
import { describe, expect, it } from "vitest";
import { ForbiddenError, TenantMismatchError } from "./errors";
import { can, PERMISSIONS, permissionsForRole, type Role } from "./roles";
import { assertSameTenant, authorize, type AuthSession } from "./session";

const tenant: TenantContext = {
  tenantId: "t-1",
  slug: "seera-pilot",
  name: "Seera-pilot",
  schemaName: "tenant_seera_pilot",
};

function session(role: Role): AuthSession {
  return { userId: "u-1", tenant, role, mfaAuthenticated: true };
}

describe("RBAC permission matrix", () => {
  it("grants CAE full access", () => {
    expect(can("cae", PERMISSIONS.READ)).toBe(true);
    expect(can("cae", PERMISSIONS.WRITE)).toBe(true);
    expect(can("cae", PERMISSIONS.MANAGE)).toBe(true);
  });

  it("grants Audit Staff read + write but not manage", () => {
    expect(can("audit_staff", PERMISSIONS.READ)).toBe(true);
    expect(can("audit_staff", PERMISSIONS.WRITE)).toBe(true);
    expect(can("audit_staff", PERMISSIONS.MANAGE)).toBe(false);
  });

  it("grants Board read-only", () => {
    expect(can("board", PERMISSIONS.READ)).toBe(true);
    expect(can("board", PERMISSIONS.WRITE)).toBe(false);
    expect(can("board", PERMISSIONS.MANAGE)).toBe(false);
    expect([...permissionsForRole("board")]).toEqual([PERMISSIONS.READ]);
  });
});

describe("authorize", () => {
  it("passes when the role is permitted", () => {
    expect(() => authorize(session("cae"), PERMISSIONS.MANAGE)).not.toThrow();
  });

  it("throws ForbiddenError when the role is not permitted", () => {
    expect(() => authorize(session("board"), PERMISSIONS.WRITE)).toThrow(
      ForbiddenError,
    );
    expect(() => authorize(session("audit_staff"), PERMISSIONS.MANAGE)).toThrow(
      ForbiddenError,
    );
  });
});

describe("assertSameTenant", () => {
  it("passes for the bound tenant", () => {
    expect(() => assertSameTenant(session("cae"), "t-1")).not.toThrow();
  });

  it("throws TenantMismatchError for any other tenant", () => {
    expect(() => assertSameTenant(session("cae"), "t-2")).toThrow(
      TenantMismatchError,
    );
  });
});
