import { evaluateRequestGate } from "@eqa/auth";
import { isPublicRoute } from "@eqa/tenant";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { LOCALE_COOKIE, LOCALE_HEADER } from "./lib/request-locale";
import { getTenantGateDependencies } from "./lib/tenant-gate";

// Headers a client might use to try to assert/override its tenant. They are
// stripped on every tenant-scoped request so they can never influence tenant
// binding — the tenant is derived solely from the verified token.
const SPOOFABLE_TENANT_HEADERS = [
  "x-tenant-slug",
  "x-tenant-id",
  "x-resolved-tenant-slug",
];

function resolveLocale(request: NextRequest): "en" | "ar" {
  const localeParam = request.nextUrl.searchParams.get("locale");
  if (localeParam === "ar" || localeParam === "en") {
    return localeParam;
  }
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  return cookieLocale === "ar" ? "ar" : "en";
}

function applyLocale(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  const localeParam = request.nextUrl.searchParams.get("locale");
  if (localeParam === "ar" || localeParam === "en") {
    response.cookies.set(LOCALE_COOKIE, localeParam, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}

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

  const locale = resolveLocale(request);
  requestHeaders.set(LOCALE_HEADER, locale);
  const nextOpts = { request: { headers: requestHeaders } };

  let response: NextResponse;

  if (isPublicRoute(pathname)) {
    response = NextResponse.next(nextOpts);
  } else {
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

    response = NextResponse.next(nextOpts);
  }

  return applyLocale(request, response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand/).*)",
  ],
};
