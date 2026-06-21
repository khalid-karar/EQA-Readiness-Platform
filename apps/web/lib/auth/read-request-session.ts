import { authenticate } from "@eqa/auth";
import type { NextRequest } from "next/server";
import { resolveSealedSession } from "./resolve-sealed-session";
import { resolveIdentityProvider } from "./resolve-provider";
import { SESSION_COOKIE } from "./session-cookie";
import { getTenantDirectory } from "../tenant-gate";

export interface ResolvedRequestSession {
  readonly accessToken: string;
  readonly refreshedSealed?: string;
}

/**
 * Resolves the encrypted session cookie, refreshing the access token when
 * expired, and returns a verified access token or null when absent/invalid.
 */
export async function resolveRequestSession(
  request: NextRequest,
): Promise<ResolvedRequestSession | null> {
  const sealed = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sealed) {
    return null;
  }

  try {
    const resolved = await resolveSealedSession(sealed);
    if (!resolved) {
      return null;
    }

    const provider = await resolveIdentityProvider();
    const directory = getTenantDirectory();
    await authenticate(resolved.payload.accessToken, provider, directory);

    return {
      accessToken: resolved.payload.accessToken,
      ...(resolved.refreshed ? { refreshedSealed: resolved.sealed } : {}),
    };
  } catch {
    return null;
  }
}

/** @deprecated Prefer {@link resolveRequestSession} for refreshed cookie handling. */
export async function readAccessTokenFromRequest(
  request: NextRequest,
): Promise<string | null> {
  const session = await resolveRequestSession(request);
  return session?.accessToken ?? null;
}
