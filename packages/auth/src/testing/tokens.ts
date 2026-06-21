import { generateKeyPair, importJWK, type KeyLike, SignJWT } from "jose";
import { KeycloakIdentityProvider, type KeycloakConfig } from "../keycloak";
import {
  STATIC_TEST_PRIVATE_JWK,
  STATIC_TEST_PUBLIC_JWK,
} from "./static-jwk";

export const TEST_ISSUER = "https://kc.test/realms/eqa";
export const TEST_AUDIENCE = "eqa-web";

export interface TestProvider {
  readonly provider: KeycloakIdentityProvider;
  readonly privateKey: KeyLike;
}

/** Creates a Keycloak provider backed by a freshly generated local key pair. */
export async function createTestProvider(opts?: {
  acceptedAmr?: readonly string[];
  acceptedAcr?: readonly string[];
  allowPasswordOnlyWithoutAmr?: boolean;
}): Promise<TestProvider> {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const config: KeycloakConfig = {
    issuer: TEST_ISSUER,
    audience: TEST_AUDIENCE,
    ...(opts?.acceptedAmr ? { acceptedAmr: opts.acceptedAmr } : {}),
    ...(opts?.acceptedAcr ? { acceptedAcr: opts.acceptedAcr } : {}),
    ...(opts?.allowPasswordOnlyWithoutAmr
      ? { allowPasswordOnlyWithoutAmr: opts.allowPasswordOnlyWithoutAmr }
      : {}),
  };
  return {
    provider: new KeycloakIdentityProvider(publicKey, config),
    privateKey,
  };
}

let staticTestProvider: TestProvider | undefined;

/** Stable key pair for E2E / Playwright (same JWKS across processes). */
export async function getStaticTestProvider(): Promise<TestProvider> {
  if (!staticTestProvider) {
    const privateKey = await importJWK(STATIC_TEST_PRIVATE_JWK, "RS256");
    const publicKey = await importJWK(STATIC_TEST_PUBLIC_JWK, "RS256");
    const config: KeycloakConfig = {
      issuer: TEST_ISSUER,
      audience: TEST_AUDIENCE,
    };
    staticTestProvider = {
      provider: new KeycloakIdentityProvider(publicKey as KeyLike, config),
      privateKey: privateKey as KeyLike,
    };
  }
  return staticTestProvider;
}

/** Test-only — reset cached static provider between suites. */
export function resetStaticTestProviderForTests(): void {
  staticTestProvider = undefined;
}

export interface TestClaims {
  sub?: string;
  tenant?: unknown;
  role?: unknown;
  amr?: readonly string[];
  acr?: string;
  azp?: string;
}

/** Mints a synthetic, signed JWT for tests. */
export async function issueToken(
  privateKey: KeyLike,
  claims: TestClaims,
  opts?: { issuer?: string; audience?: string; expired?: boolean; skipAudience?: boolean },
): Promise<string> {
  const payload: Record<string, unknown> = {};
  if (claims.tenant !== undefined) payload["tenant"] = claims.tenant;
  if (claims.role !== undefined) payload["role"] = claims.role;
  if (claims.amr !== undefined) payload["amr"] = claims.amr;
  if (claims.acr !== undefined) payload["acr"] = claims.acr;
  if (claims.azp !== undefined) payload["azp"] = claims.azp;

  const builder = new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256" })
    .setSubject(claims.sub ?? "user-123")
    .setIssuer(opts?.issuer ?? TEST_ISSUER)
    .setIssuedAt()
    .setExpirationTime(opts?.expired ? "-1m" : "5m");

  if (!opts?.skipAudience) {
    builder.setAudience(opts?.audience ?? TEST_AUDIENCE);
  }

  return builder.sign(privateKey);
}
