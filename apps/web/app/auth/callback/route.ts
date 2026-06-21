import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getOidcConfig } from "@/lib/auth/config";
import { exchangeCodeForTokens } from "@/lib/auth/oidc";
import {
  encryptSession,
  OAUTH_STATE_COOKIE,
  RETURN_TO_COOKIE,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth/session-cookie";
import { resolveIdentityProvider } from "@/lib/auth/resolve-provider";
import { getTenantDirectory } from "@/lib/tenant-gate";
import { authenticate } from "@eqa/auth";

function loginErrorRedirect(
  request: NextRequest,
  reason: string,
): NextResponse {
  const url = new URL("/auth/login", request.url);
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const config = getOidcConfig();
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const storedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || !storedState || state !== storedState) {
    return loginErrorRedirect(request, "invalid_state");
  }

  try {
    const tokens = await exchangeCodeForTokens(config, code);
    const provider = await resolveIdentityProvider();
    const directory = getTenantDirectory();
    await authenticate(tokens.access_token, provider, directory);

    const expiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in;
    const sealed = await encryptSession(
      {
        accessToken: tokens.access_token,
        expiresAt,
        ...(tokens.refresh_token
          ? { refreshToken: tokens.refresh_token }
          : {}),
      },
      config,
    );

    const returnTo =
      request.cookies.get(RETURN_TO_COOKIE)?.value ?? "/dashboard";
    const response = NextResponse.redirect(new URL(returnTo, config.appUrl));

    response.cookies.set(SESSION_COOKIE, sealed, sessionCookieOptions());
    response.cookies.delete(OAUTH_STATE_COOKIE);
    response.cookies.delete(RETURN_TO_COOKIE);

    return response;
  } catch {
    return loginErrorRedirect(request, "authentication_failed");
  }
}
