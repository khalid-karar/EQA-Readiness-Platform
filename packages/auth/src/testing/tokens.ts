import { generateKeyPair, type KeyLike, SignJWT } from "jose";
import { KeycloakIdentityProvider, type KeycloakConfig } from "../keycloak";

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
}): Promise<TestProvider> {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const config: KeycloakConfig = {
    issuer: TEST_ISSUER,
    audience: TEST_AUDIENCE,
    ...(opts?.acceptedAmr ? { acceptedAmr: opts.acceptedAmr } : {}),
    ...(opts?.acceptedAcr ? { acceptedAcr: opts.acceptedAcr } : {}),
  };
  return {
    provider: new KeycloakIdentityProvider(publicKey, config),
    privateKey,
  };
}

export interface TestClaims {
  sub?: string;
  tenant?: unknown;
  role?: unknown;
  amr?: readonly string[];
  acr?: string;
}

/** Mints a synthetic, signed JWT for tests. */
export async function issueToken(
  privateKey: KeyLike,
  claims: TestClaims,
  opts?: { issuer?: string; audience?: string; expired?: boolean },
): Promise<string> {
  const payload: Record<string, unknown> = {};
  if (claims.tenant !== undefined) payload["tenant"] = claims.tenant;
  if (claims.role !== undefined) payload["role"] = claims.role;
  if (claims.amr !== undefined) payload["amr"] = claims.amr;
  if (claims.acr !== undefined) payload["acr"] = claims.acr;

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256" })
    .setSubject(claims.sub ?? "user-123")
    .setIssuer(opts?.issuer ?? TEST_ISSUER)
    .setAudience(opts?.audience ?? TEST_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(opts?.expired ? "-1m" : "5m")
    .sign(privateKey);
}
