import { evaluateRequestGate } from "@eqa/auth";
import { isPublicRoute } from "@eqa/tenant";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resolveRequestSession } from "./lib/auth/read-request-session";
import { SESSION_COOKIE, sessionCookieOptions } from "./lib/auth/session-cookie";
import { LOCALE_COOKIE, LOCALE_HEADER } from "./lib/request-locale";
import { resolveTenantGateDependencies } from "./lib/tenant-gate";

// Headers a client might use to try to assert/override its tenant. They are
// stripped on every tenant-scoped request so they can never influence tenant
// binding — the tenant is derived solely from the verified token.
const SPOOFABLE_TENANT_HEADERS = [
  "x-tenant-slug",
  "x-tenant-id",
  "x-resolved-tenant-slug",
];

const LOGIN_PATH = "/auth/login";

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

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

function loginRedirect(request: NextRequest): NextResponse {
  const loginUrl = new URL(LOGIN_PATH, request.url);
  loginUrl.searchParams.set("returnTo", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Request gate.
 *
 * - Public (allowlisted) routes pass through with no auth and no tenant
 *   resolution.
 * - Tenant-scoped routes verify the session access token, resolve tenant from
 *   the token claim, and reject centrally when context is missing or invalid.
 * - HTML navigations redirect to login; API routes return 401 JSON.
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
    const session = await resolveRequestSession(request);
    if (session?.accessToken) {
      requestHeaders.set("authorization", `Bearer ${session.accessToken}`);
    }

    const { provider, directory } = await resolveTenantGateDependencies();
    const outcome = await evaluateRequestGate(
      pathname,
      requestHeaders,
      provider,
      directory,
    );

    if (!outcome.allowed) {
      if (outcome.status === 401) {
        if (isApiRoute(pathname)) {
          response = NextResponse.json(
            { error: outcome.error, path: pathname },
            { status: 401 },
          );
        } else {
          response = loginRedirect(request);
        }
        clearSessionCookie(response);
        return applyLocale(request, response);
      }
      return NextResponse.json(
        { error: outcome.error, path: pathname },
        { status: outcome.status },
      );
    }

    response = NextResponse.next(nextOpts);
    if (session?.refreshedSealed) {
      response.cookies.set(
        SESSION_COOKIE,
        session.refreshedSealed,
        sessionCookieOptions(),
      );
    }
  }

  return applyLocale(request, response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand/).*)",
  ],
};
