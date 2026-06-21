import { authenticate, type AuthSession } from "@eqa/auth";
import { cookies } from "next/headers";
import { getOidcConfig } from "./config";
import {
  decryptSession,
  isSessionExpired,
  SESSION_COOKIE,
} from "./session-cookie";
import { resolveIdentityProvider } from "./resolve-provider";
import { getTenantDirectory } from "../tenant-gate";

/** Verified session from the encrypted httpOnly cookie (server components / routes). */
export async function getServerSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const sealed = cookieStore.get(SESSION_COOKIE)?.value;
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
    return await authenticate(payload.accessToken, provider, directory);
  } catch {
    return null;
  }
}

/** Like {@link getServerSession} but throws when absent (pages behind middleware). */
export async function requireServerSession(): Promise<AuthSession> {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Authenticated session required.");
  }
  return session;
}
