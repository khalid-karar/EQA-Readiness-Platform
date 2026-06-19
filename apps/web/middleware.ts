import { isPublicRoute } from "@eqa/tenant";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Headers a client might use to try to assert/override its tenant. They are
// stripped on every authenticated request so they can never influence tenant
// binding — the tenant is derived solely from the verified token.
const SPOOFABLE_TENANT_HEADERS = [
  "x-tenant-slug",
  "x-tenant-id",
  "x-resolved-tenant-slug",
];

/**
 * Request gate.
 *
 * - Public (allowlisted) routes — `/health`, `/`, `/auth/*` — pass through with
 *   no auth and no tenant resolution (Step 2 behaviour preserved).
 * - Every other route requires a Bearer token. The token is verified and turned
 *   into a tenant-bound session in the data/route layer (see
 *   `authenticateRequest`); the tenant is taken from the token, never a header.
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  for (const header of SPOOFABLE_TENANT_HEADERS) {
    requestHeaders.delete(header);
  }

  const authorization = request.headers.get("authorization");
  if (!authorization || !/^Bearer\s+.+/i.test(authorization)) {
    return NextResponse.json(
      { error: "authentication_required", path: pathname },
      { status: 401 },
    );
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
