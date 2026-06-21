import type { AuthSession } from "@eqa/auth";
import { MissingTenantContextError } from "@eqa/tenant";
import type { Database } from "../database";
import {
  createTenantRepositories,
  type TenantRepositories,
} from "../repositories";

/** Fail closed — data loaders require a verified session with tenant context. */
export function assertUiSession(
  session: AuthSession | null | undefined,
): AuthSession {
  if (!session?.tenant?.schemaName) {
    throw new MissingTenantContextError(
      "UI data load requires an authenticated session with tenant context.",
    );
  }
  return session;
}

export function uiRepositories(
  db: Database,
  session: AuthSession,
): TenantRepositories {
  return createTenantRepositories(db, assertUiSession(session));
}
