import { NextResponse } from "next/server";
import { getOidcConfig } from "@/lib/auth/config";
import { buildLogoutUrl } from "@/lib/auth/oidc";
import { SESSION_COOKIE } from "@/lib/auth/session-cookie";

export async function GET(): Promise<NextResponse> {
  const config = getOidcConfig();
  const response = NextResponse.redirect(
    buildLogoutUrl(config, `${config.appUrl}/`),
  );

  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
