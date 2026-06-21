import {
  createRemoteJWKSet,
  type JWTPayload,
  type JWTVerifyGetKey,
  jwtVerify,
  type KeyLike,
} from "jose";
import { AuthenticationError, MfaRequiredError } from "./errors";
import type { IdentityProvider, VerifiedIdentity } from "./identity";
import { isRole, type Role } from "./roles";

/** Key material accepted by jose's verifier (local key, or a JWKS resolver). */
type VerificationKey = KeyLike | Uint8Array | JWTVerifyGetKey;

export interface KeycloakConfig {
  /** Expected token issuer, e.g. https://kc.ksa.internal/realms/eqa */
  readonly issuer: string;
  /** Expected audience (client id / resource). */
  readonly audience: string;
  /** Claim carrying the tenant slug. Default: "tenant". */
  readonly tenantClaim?: string;
  /** Claim carrying the role. Default: "role". */
  readonly roleClaim?: string;
  /** `amr` values that count as MFA. Default: common second-factor methods. */
  readonly acceptedAmr?: readonly string[];
  /** `acr` values that count as MFA (e.g. a step-up level). Default: none. */
  readonly acceptedAcr?: readonly string[];
}

const DEFAULT_MFA_AMR = ["otp", "totp", "mfa", "hwk", "webauthn", "sms", "pop"];

/**
 * Verifies Keycloak-issued OIDC access/ID tokens and enforces mandatory MFA.
 * Tenant and role are read from token claims, binding identity to tenant at the
 * token level.
 */
export class KeycloakIdentityProvider implements IdentityProvider {
  constructor(
    private readonly key: VerificationKey,
    private readonly config: KeycloakConfig,
  ) {}

  async verify(credential: string): Promise<VerifiedIdentity> {
    const options = { issuer: this.config.issuer };
    let payload: JWTPayload;
    try {
      // Audience checked after verify — Keycloak often uses `azp` on access tokens.
      const result =
        typeof this.key === "function"
          ? await jwtVerify(credential, this.key, options)
          : await jwtVerify(credential, this.key, options);
      payload = result.payload;
    } catch {
      // Opaque on purpose — never leak token/verification details.
      throw new AuthenticationError("Token verification failed.");
    }

    if (!audienceMatches(payload, this.config.audience)) {
      throw new AuthenticationError("Token verification failed.");
    }

    if (!isMfaSatisfied(payload, this.config)) {
      throw new MfaRequiredError();
    }

    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      throw new AuthenticationError("Token is missing a subject.");
    }

    const tenantSlug = readStringClaim(
      payload,
      this.config.tenantClaim ?? "tenant",
    );
    if (!tenantSlug) {
      throw new AuthenticationError("Token is missing a valid tenant claim.");
    }

    const role = readRoleClaim(payload, this.config.roleClaim ?? "role");
    if (!role) {
      throw new AuthenticationError(
        "Token is missing exactly one valid role claim.",
      );
    }

    return { userId: payload.sub, tenantSlug, role, mfa: true };
  }
}

/**
 * Builds a Keycloak provider that fetches signing keys from the realm's JWKS
 * endpoint. Use in production/runtime.
 */
export function createKeycloakIdentityProvider(
  config: KeycloakConfig,
): KeycloakIdentityProvider {
  const issuer = config.issuer.replace(/\/$/, "");
  const jwks = createRemoteJWKSet(
    new URL(`${issuer}/protocol/openid-connect/certs`),
  );
  return new KeycloakIdentityProvider(jwks, config);
}

function audienceMatches(payload: JWTPayload, expected: string): boolean {
  const aud = payload.aud;
  if (typeof aud === "string" && aud === expected) {
    return true;
  }
  if (Array.isArray(aud) && aud.includes(expected)) {
    return true;
  }
  return payload.azp === expected;
}

function isMfaSatisfied(payload: JWTPayload, config: KeycloakConfig): boolean {
  const accepted = new Set(
    (config.acceptedAmr ?? DEFAULT_MFA_AMR).map((m) => m.toLowerCase()),
  );
  const amr = payload["amr"];
  if (
    Array.isArray(amr) &&
    amr.some((m) => typeof m === "string" && accepted.has(m.toLowerCase()))
  ) {
    return true;
  }

  const acr = payload["acr"];
  if (
    typeof acr === "string" &&
    config.acceptedAcr !== undefined &&
    config.acceptedAcr.includes(acr)
  ) {
    return true;
  }

  return false;
}

function readStringClaim(payload: JWTPayload, name: string): string | null {
  const value = payload[name];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readRoleClaim(payload: JWTPayload, name: string): Role | null {
  const value = payload[name];
  if (typeof value === "string") {
    return isRole(value) ? value : null;
  }
  if (Array.isArray(value)) {
    const roles = value.filter(isRole);
    return roles.length === 1 ? (roles[0] as Role) : null;
  }
  return null;
}
