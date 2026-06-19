/**
 * RBAC model. A user belongs to exactly one tenant and has exactly one role.
 *
 * Roles:
 * - `cae`         — Chief Audit Executive: full access within their tenant.
 * - `audit_staff` — operational access (read + write operational data).
 * - `board`       — Board / Audit Committee: read-only.
 */
export const ROLES = ["cae", "audit_staff", "board"] as const;
export type Role = (typeof ROLES)[number];

/** Permissions checked by the data layer. */
export const PERMISSIONS = {
  /** Read tenant data. */
  READ: "tenant_data:read",
  /** Create/update operational tenant data. */
  WRITE: "tenant_data:write",
  /** Administer the tenant (settings, configuration). */
  MANAGE: "tenant:manage",
} as const;
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  cae: new Set([PERMISSIONS.READ, PERMISSIONS.WRITE, PERMISSIONS.MANAGE]),
  audit_staff: new Set([PERMISSIONS.READ, PERMISSIONS.WRITE]),
  board: new Set([PERMISSIONS.READ]),
};

export function isRole(value: unknown): value is Role {
  return (
    typeof value === "string" && (ROLES as readonly string[]).includes(value)
  );
}

/** True if `role` is granted `permission`. */
export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

/** The permission set granted to a role. */
export function permissionsForRole(role: Role): ReadonlySet<Permission> {
  return ROLE_PERMISSIONS[role];
}
