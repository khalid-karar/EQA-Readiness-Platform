import { authenticate, type AuthSession } from "@eqa/auth";
import { cookies, headers } from "next/headers";
import { resolveSealedSession } from "./resolve-sealed-session";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
} from "./session-cookie";
import { resolveIdentityProvider } from "./resolve-provider";
import { getTenantDirectory } from "../tenant-gate";

function readBearerToken(authorization: string | null): string | null {
  if (!authorization) {
    return null;
  }
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match?.[1] ?? null;
}

async function sessionFromAccessToken(
  accessToken: string,
): Promise<AuthSession | null> {
  try {
    const provider = await resolveIdentityProvider();
    const directory = getTenantDirectory();
    return await authenticate(accessToken, provider, directory);
  } catch {
    return null;
  }
}

async function sessionFromSealedCookie(
  sealed: string,
  persistIfRefreshed: boolean,
): Promise<AuthSession | null> {
  try {
    const resolved = await resolveSealedSession(sealed);
    if (!resolved) {
      return null;
    }

    if (persistIfRefreshed && resolved.refreshed) {
      const cookieStore = await cookies();
      cookieStore.set(
        SESSION_COOKIE,
        resolved.sealed,
        sessionCookieOptions(),
      );
    }

    return sessionFromAccessToken(resolved.payload.accessToken);
  } catch {
    return null;
  }
}

/**
 * Verified session from the encrypted httpOnly cookie (with token refresh),
 * falling back to the bearer token middleware forwards on tenant-scoped requests.
 */
export async function getServerSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const sealed = cookieStore.get(SESSION_COOKIE)?.value;
  if (sealed) {
    const fromCookie = await sessionFromSealedCookie(sealed, true);
    if (fromCookie) {
      return fromCookie;
    }
  }

  const headerStore = await headers();
  const bearer = readBearerToken(headerStore.get("authorization"));
  if (bearer) {
    return sessionFromAccessToken(bearer);
  }

  return null;
}

/**
 * Route-handler session lookup — resolves the cookie first (with refresh), then
 * falls back to the Authorization header middleware forwards.
 */
export async function getServerSessionFromRequest(
  request: Request,
): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const sealed = cookieStore.get(SESSION_COOKIE)?.value;
  if (sealed) {
    const fromCookie = await sessionFromSealedCookie(sealed, true);
    if (fromCookie) {
      return fromCookie;
    }
  }

  const bearer = readBearerToken(request.headers.get("authorization"));
  if (bearer) {
    return sessionFromAccessToken(bearer);
  }

  return null;
}

/** Like {@link getServerSession} but throws when absent (pages behind middleware). */
export async function requireServerSession(): Promise<AuthSession> {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Authenticated session required.");
  }
  return session;
}
