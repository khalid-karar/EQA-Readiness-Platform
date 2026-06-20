import {
  createKeycloakIdentityProvider,
  type IdentityProvider,
} from "@eqa/auth";
import {
  createAllowlistTenantDirectoryFromSlugs,
  type TenantDirectory,
} from "@eqa/tenant";

const DEFAULT_TENANT_ALLOWLIST = ["seera-pilot", "beta-co"];

export interface TenantGateDependencies {
  readonly provider: IdentityProvider;
  readonly directory: TenantDirectory;
}

function parseTenantAllowlist(raw: string | undefined): readonly string[] {
  const slugs = (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return slugs.length > 0 ? slugs : DEFAULT_TENANT_ALLOWLIST;
}

function createMiddlewareIdentityProvider(): IdentityProvider {
  const issuer = process.env.KEYCLOAK_ISSUER;
  const audience = process.env.KEYCLOAK_AUDIENCE;
  if (!issuer || !audience) {
    throw new Error(
      "KEYCLOAK_ISSUER and KEYCLOAK_AUDIENCE are required for tenant request gating.",
    );
  }
  return createKeycloakIdentityProvider({
    issuer,
    audience,
    tenantClaim: process.env.KEYCLOAK_TENANT_CLAIM ?? "tenant",
    roleClaim: process.env.KEYCLOAK_ROLE_CLAIM ?? "role",
  });
}

let cached: TenantGateDependencies | undefined;

/** Lazily builds middleware gate dependencies (JWKS + tenant allowlist). */
export function getTenantGateDependencies(): TenantGateDependencies {
  if (!cached) {
    cached = {
      provider: createMiddlewareIdentityProvider(),
      directory: createAllowlistTenantDirectoryFromSlugs(
        parseTenantAllowlist(process.env.TENANT_ALLOWLIST),
      ),
    };
  }
  return cached;
}

/** Test hook — inject gate dependencies without touching process env caches. */
export function setTenantGateDependenciesForTests(
  deps: TenantGateDependencies | undefined,
): void {
  cached = deps;
}
