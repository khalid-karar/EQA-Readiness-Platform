import { authenticate } from "@eqa/auth";
import type { NextRequest } from "next/server";
import { getOidcConfig } from "./config";
import {
  decryptSession,
  isSessionExpired,
  SESSION_COOKIE,
} from "./session-cookie";
import { resolveIdentityProvider } from "./resolve-provider";
import { getTenantDirectory } from "../tenant-gate";

/**
 * Reads the encrypted session cookie and returns a verified access token, or
 * null when absent, expired, or invalid.
 */
export async function readAccessTokenFromRequest(
  request: NextRequest,
): Promise<string | null> {
  const sealed = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sealed) {
    return null;
  }

  try {
    const config = getOidcConfig();
    const payload = await decryptSession(sealed, config);
    if (!payload || isSessionExpired(payload)) {
      return null;
    }

    const provider = await resolveIdentityProvider();
    const directory = getTenantDirectory();
    await authenticate(payload.accessToken, provider, directory);
    return payload.accessToken;
  } catch {
    return null;
  }
}
