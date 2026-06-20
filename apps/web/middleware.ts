import { evaluateRequestGate } from "@eqa/auth";
import { isPublicRoute } from "@eqa/tenant";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getTenantGateDependencies } from "./lib/tenant-gate";

// Headers a client might use to try to assert/override its tenant. They are
// stripped on every tenant-scoped request so they can never influence tenant
// binding — the tenant is derived solely from the verified token.
const SPOOFABLE_TENANT_HEADERS = [
  "x-tenant-slug",
  "x-tenant-id",
  "x-resolved-tenant-slug",
];

/**
 * Request gate.
 *
 * - Public (allowlisted) routes pass through with no auth and no tenant
 *   resolution (Step 2 behaviour preserved).
 * - Tenant-scoped routes verify the bearer token, resolve tenant from the token
 *   claim against the allowlist directory, and reject centrally when context is
 *   missing or invalid — before any handler runs (standing rule 7 at the edge).
 * - Data-layer tenant guards remain as defense-in-depth.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  const requestHeaders = new Headers(request.headers);
  for (const header of SPOOFABLE_TENANT_HEADERS) {
    requestHeaders.delete(header);
  }

  if (isPublicRoute(pathname)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const { provider, directory } = getTenantGateDependencies();
  const outcome = await evaluateRequestGate(
    pathname,
    requestHeaders,
    provider,
    directory,
  );

  if (!outcome.allowed) {
    return NextResponse.json(
      { error: outcome.error, path: pathname },
      { status: outcome.status },
    );
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand/).*)",
  ],
};
