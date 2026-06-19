import type { TenantContext } from "./context";
import type { TenantDirectory } from "./directory";
import { TenantNotResolvedError } from "./errors";
import { isPublicRoute } from "./public-routes";

/** The outcome of resolving a request against the tenancy model. */
export type TenantResolution =
  | { readonly kind: "public" }
  | { readonly kind: "tenant"; readonly context: TenantContext };

export interface ResolveInput {
  /** Request path, used against the public-route allowlist. */
  readonly pathname: string;
  /** Tenant identifier carried by the request (header or subdomain). */
  readonly tenantSlug?: string | null;
}

/**
 * Resolves the tenant context for a request.
 *
 * - Public (allowlisted) routes resolve to `{ kind: "public" }` and never need a
 *   tenant — so health checks and pre-auth paths don't fail for lack of one.
 * - Otherwise a tenant slug must be present and map to an active tenant in the
 *   directory, or {@link TenantNotResolvedError} is thrown.
 */
export async function resolveTenantContext(
  input: ResolveInput,
  directory: TenantDirectory,
): Promise<TenantResolution> {
  if (isPublicRoute(input.pathname)) {
    return { kind: "public" };
  }

  const slug = input.tenantSlug?.trim();
  if (!slug) {
    throw new TenantNotResolvedError(
      "Tenant-scoped request did not carry a tenant identifier.",
    );
  }

  const descriptor = await directory.findBySlug(slug);
  if (!descriptor || descriptor.status !== "active") {
    throw new TenantNotResolvedError(
      `No active tenant resolved for slug '${slug}'.`,
    );
  }

  return {
    kind: "tenant",
    context: {
      tenantId: descriptor.id,
      slug: descriptor.slug,
      name: descriptor.name,
      schemaName: descriptor.schemaName,
    },
  };
}
