import { getOidcConfig } from "./config";
import { refreshAccessToken } from "./oidc";
import {
  decryptSession,
  encryptSession,
  isSessionExpired,
  type SessionPayload,
} from "./session-cookie";

export interface ResolvedSealedSession {
  readonly payload: SessionPayload;
  readonly sealed: string;
  readonly refreshed: boolean;
}

/**
 * Decrypts the session cookie and refreshes the access token when expired but a
 * refresh token is still valid.
 */
export async function resolveSealedSession(
  sealed: string,
): Promise<ResolvedSealedSession | null> {
  const config = getOidcConfig();
  const payload = await decryptSession(sealed, config);
  if (!payload) {
    return null;
  }

  if (!isSessionExpired(payload)) {
    return { payload, sealed, refreshed: false };
  }

  if (!payload.refreshToken) {
    return null;
  }

  try {
    const tokens = await refreshAccessToken(config, payload.refreshToken);
    const refreshedPayload: SessionPayload = {
      accessToken: tokens.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in,
      refreshToken: tokens.refresh_token ?? payload.refreshToken,
    };
    const refreshedSealed = await encryptSession(refreshedPayload, config);
    return {
      payload: refreshedPayload,
      sealed: refreshedSealed,
      refreshed: true,
    };
  } catch {
    return null;
  }
}
