/**
 * @eqa/auth
 *
 * Authentication and RBAC. Identity is verified through a swappable
 * IdentityProvider (Keycloak/OIDC now, SAML/SSO later) with mandatory MFA. The
 * user's tenant and single role are bound from the verified token, never from a
 * request header. RBAC permissions are enforced by the data layer (see
 * @eqa/db), so a decision cannot be bypassed by calling repositories directly.
 */

export {
  AuthError,
  AuthenticationError,
  ForbiddenError,
  MfaRequiredError,
  TenantMismatchError,
} from "./errors";

export {
  can,
  isRole,
  permissionsForRole,
  PERMISSIONS,
  ROLES,
  type Permission,
  type Role,
} from "./roles";

export { assertSameTenant, authorize, type AuthSession } from "./session";

export type { IdentityProvider, VerifiedIdentity } from "./identity";

export {
  createKeycloakIdentityProvider,
  KeycloakIdentityProvider,
  type KeycloakConfig,
} from "./keycloak";

export {
  authenticate,
  authenticateRequest,
  type HeaderSource,
} from "./authenticate";

export {
  evaluateRequestGate,
  type RequestGateOutcome,
  type RequestGateRejection,
  type RequestGateSuccess,
} from "./request-gate";
