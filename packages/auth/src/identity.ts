import type { Role } from "./roles";

/**
 * The identity established by verifying a credential, before it is resolved into
 * a full {@link AuthSession}. Tenant and role come from the verified credential
 * itself, so they cannot be influenced by request headers or parameters.
 */
export interface VerifiedIdentity {
  readonly userId: string;
  readonly tenantSlug: string;
  readonly role: Role;
  /** Always true: providers reject credentials that do not evidence MFA. */
  readonly mfa: true;
}

/**
 * Swappable identity provider. Keycloak (OIDC) is the initial implementation;
 * SAML/SSO can be added later by implementing this same interface, with no
 * change to callers.
 */
export interface IdentityProvider {
  /** Verifies a credential (e.g. a bearer token) and returns the identity. */
  verify(credential: string): Promise<VerifiedIdentity>;
}
