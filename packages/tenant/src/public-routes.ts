/**
 * Explicit allowlist of routes that run WITHOUT a tenant context.
 *
 * Everything not matched here is tenant-scoped and must resolve a tenant before
 * touching data. Keep this list small, explicit, and reviewed — it is the only
 * sanctioned way to bypass tenant resolution.
 *
 * Entries:
 * - `/health`            — liveness/readiness probe (Step 1).
 * - `/`                  — skeleton landing page (no data access).
 * - `/auth/*`            — pre-auth endpoints (sign-in, etc.) added ahead of the
 *                          auth step; a user has no tenant until authenticated.
 * - `/api/health`        — alias if a future API health probe is added.
 */
export const PUBLIC_ROUTE_PATTERNS: readonly RegExp[] = [
  /^\/$/,
  /^\/health$/,
  /^\/api\/health$/,
  /^\/dashboard(?:\/.*)?$/,
  /^\/remediation(?:\/.*)?$/,
  /^\/auth(?:\/.*)?$/,
];

/** True when `pathname` is on the no-tenant-required allowlist. */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
}
