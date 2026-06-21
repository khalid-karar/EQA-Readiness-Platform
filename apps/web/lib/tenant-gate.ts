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

/**
 * Whether local Keycloak password-only tokens (no `amr`) may pass MFA checks.
 * Production always returns false — production enforces MFA.
 */
export function resolveAllowPasswordOnlyWithoutAmr(
  issuer: string,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  if (nodeEnv === "production") {
    return false;
  }
  return issuer.includes("localhost") || issuer.includes("127.0.0.1");
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
    allowPasswordOnlyWithoutAmr: resolveAllowPasswordOnlyWithoutAmr(issuer),
  });
}

let cachedDirectory: TenantDirectory | undefined;
let cachedProvider: IdentityProvider | undefined;

export function getTenantDirectory(): TenantDirectory {
  if (!cachedDirectory) {
    cachedDirectory = createAllowlistTenantDirectoryFromSlugs(
      parseTenantAllowlist(process.env.TENANT_ALLOWLIST),
    );
  }
  return cachedDirectory;
}

export function getMiddlewareIdentityProvider(): IdentityProvider {
  if (!cachedProvider) {
    cachedProvider = createMiddlewareIdentityProvider();
  }
  return cachedProvider;
}

/**
 * Builds gate dependencies for tenant-scoped routes only — never call for
 * public allowlist paths (middleware short-circuits those first).
 */
export function getTenantGateDependencies(): TenantGateDependencies {
  return {
    provider: getMiddlewareIdentityProvider(),
    directory: getTenantDirectory(),
  };
}

/** Async resolver — supports E2E test JWKS provider when `EQA_E2E_TEST_AUTH=true`. */
export async function resolveTenantGateDependencies(): Promise<TenantGateDependencies> {
  if (process.env.EQA_E2E_TEST_AUTH === "true") {
    const { resolveIdentityProvider } = await import("./auth/resolve-provider");
    return {
      provider: await resolveIdentityProvider(),
      directory: getTenantDirectory(),
    };
  }
  return getTenantGateDependencies();
}

/** Test hook — inject gate dependencies without touching process env caches. */
export function setTenantGateDependenciesForTests(
  deps: TenantGateDependencies | undefined,
): void {
  if (deps) {
    cachedProvider = deps.provider;
    cachedDirectory = deps.directory;
  } else {
    cachedProvider = undefined;
    cachedDirectory = undefined;
  }
}
