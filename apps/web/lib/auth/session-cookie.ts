import { EncryptJWT, jwtDecrypt } from "jose";
import type { OidcConfig } from "./config";

export const SESSION_COOKIE = "eqa_session";
export const OAUTH_STATE_COOKIE = "eqa_oauth_state";
export const RETURN_TO_COOKIE = "eqa_return_to";

export interface SessionPayload {
  readonly accessToken: string;
  readonly refreshToken?: string | undefined;
  readonly expiresAt: number;
}

async function sessionKey(secret: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret),
  );
  return new Uint8Array(digest);
}

export async function encryptSession(
  payload: SessionPayload,
  config: OidcConfig,
): Promise<string> {
  return new EncryptJWT({ ...payload })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .encrypt(await sessionKey(config.sessionSecret));
}

export async function decryptSession(
  token: string,
  config: OidcConfig,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtDecrypt(
      token,
      await sessionKey(config.sessionSecret),
      {
        contentEncryptionAlgorithms: ["A256GCM"],
      },
    );
    const accessToken = payload.accessToken;
    const expiresAt = payload.expiresAt;
    if (typeof accessToken !== "string" || typeof expiresAt !== "number") {
      return null;
    }
    const refreshToken =
      typeof payload.refreshToken === "string"
        ? payload.refreshToken
        : undefined;
    return { accessToken, refreshToken, expiresAt };
  } catch {
    return null;
  }
}

export function isSessionExpired(payload: SessionPayload): boolean {
  return Date.now() >= payload.expiresAt * 1000 - 30_000;
}
