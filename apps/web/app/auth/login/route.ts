import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getOidcConfig } from "@/lib/auth/config";
import { buildAuthorizationUrl } from "@/lib/auth/oidc";
import {
  OAUTH_STATE_COOKIE,
  RETURN_TO_COOKIE,
} from "@/lib/auth/session-cookie";

function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }
  if (value.startsWith("/auth")) {
    return "/dashboard";
  }
  return value;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const config = getOidcConfig();
  const returnTo = safeReturnTo(
    request.nextUrl.searchParams.get("returnTo"),
  );
  const state = randomBytes(32).toString("hex");

  const response = NextResponse.redirect(buildAuthorizationUrl(config, state));
  const secure = process.env.NODE_ENV === "production";

  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/auth/callback",
    maxAge: 600,
  });
  response.cookies.set(RETURN_TO_COOKIE, returnTo, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return response;
}
