import type { TenantDirectory } from "@eqa/tenant";
import { AuthenticationError } from "./errors";
import type { IdentityProvider } from "./identity";
import type { AuthSession } from "./session";

/**
 * Verifies a credential and resolves it into an {@link AuthSession}.
 *
 * The tenant is taken from the verified identity (the token), then resolved
 * against the directory to obtain the tenant's schema. It is NEVER taken from a
 * request header or parameter — this is what closes the forged-tenant path.
 */
export async function authenticate(
  credential: string,
  provider: IdentityProvider,
  directory: TenantDirectory,
): Promise<AuthSession> {
  const identity = await provider.verify(credential);

  const descriptor = await directory.findBySlug(identity.tenantSlug);
  if (!descriptor || descriptor.status !== "active") {
    throw new AuthenticationError(
      `No active tenant for identity (tenant '${identity.tenantSlug}').`,
    );
  }

  return {
    userId: identity.userId,
    role: identity.role,
    tenant: {
      tenantId: descriptor.id,
      slug: descriptor.slug,
      name: descriptor.name,
      schemaName: descriptor.schemaName,
    },
    mfaAuthenticated: true,
  };
}

/** Header bag: a Fetch `Headers`, a NextRequest's headers, or a plain object. */
export type HeaderSource =
  | { get(name: string): string | null }
  | Record<string, string | string[] | undefined>;

function readAuthorization(headers: HeaderSource): string | null {
  if (typeof (headers as { get?: unknown }).get === "function") {
    return (headers as { get(name: string): string | null }).get(
      "authorization",
    );
  }
  const bag = headers as Record<string, string | string[] | undefined>;
  for (const [key, value] of Object.entries(bag)) {
    if (key.toLowerCase() === "authorization") {
      return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
    }
  }
  return null;
}

/**
 * Authenticates a request from its headers. Reads ONLY the Authorization bearer
 * token — any `x-tenant-*` or similar header is ignored, so a client cannot
 * select or override its tenant. Tenant binding comes solely from the token.
 */
export async function authenticateRequest(
  headers: HeaderSource,
  provider: IdentityProvider,
  directory: TenantDirectory,
): Promise<AuthSession> {
  const authorization = readAuthorization(headers);
  if (!authorization) {
    throw new AuthenticationError("Missing Authorization header.");
  }
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  if (!match || !match[1]) {
    throw new AuthenticationError(
      "Authorization header must be a Bearer token.",
    );
  }
  return authenticate(match[1], provider, directory);
}
