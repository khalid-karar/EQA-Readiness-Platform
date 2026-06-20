import {
  isPublicRoute,
  resolveTenantContext,
  TenantNotResolvedError,
  type TenantContext,
  type TenantDirectory,
} from "@eqa/tenant";
import { authenticateRequest, type HeaderSource } from "./authenticate";
import { AuthenticationError, MfaRequiredError } from "./errors";
import type { IdentityProvider } from "./identity";
import type { AuthSession } from "./session";

export type RequestGateRejection = {
  readonly allowed: false;
  readonly status: 401 | 403;
  readonly error: "authentication_required" | "tenant_not_resolved";
};

export type RequestGateSuccess =
  | { readonly allowed: true; readonly kind: "public" }
  | {
      readonly allowed: true;
      readonly kind: "tenant";
      readonly session: AuthSession;
      readonly context: TenantContext;
    };

export type RequestGateOutcome = RequestGateRejection | RequestGateSuccess;

/**
 * Central request gate for tenant-scoped routes (standing rule 7 at the edge).
 *
 * - Public allowlist routes pass without authentication or tenant resolution.
 * - Every other route verifies the bearer token, binds tenant from the token
 *   claim (never headers), and resolves an active tenant before a handler can
 *   run. Data-layer checks remain as defense-in-depth.
 */
export async function evaluateRequestGate(
  pathname: string,
  headers: HeaderSource,
  provider: IdentityProvider,
  directory: TenantDirectory,
): Promise<RequestGateOutcome> {
  if (isPublicRoute(pathname)) {
    return { allowed: true, kind: "public" };
  }

  try {
    const session = await authenticateRequest(headers, provider, directory);
    const resolution = await resolveTenantContext(
      { pathname, tenantSlug: session.tenant.slug },
      directory,
    );
    if (resolution.kind !== "tenant") {
      return {
        allowed: false,
        status: 403,
        error: "tenant_not_resolved",
      };
    }
    return {
      allowed: true,
      kind: "tenant",
      session,
      context: resolution.context,
    };
  } catch (error) {
    if (
      error instanceof AuthenticationError ||
      error instanceof MfaRequiredError
    ) {
      return {
        allowed: false,
        status: 401,
        error: "authentication_required",
      };
    }
    if (error instanceof TenantNotResolvedError) {
      return {
        allowed: false,
        status: 403,
        error: "tenant_not_resolved",
      };
    }
    throw error;
  }
}
