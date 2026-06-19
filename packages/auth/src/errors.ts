export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Authentication failed (bad/expired/invalid token, missing claims). HTTP 401. */
export class AuthenticationError extends AuthError {}

/** The credential did not evidence multi-factor authentication. HTTP 401. */
export class MfaRequiredError extends AuthenticationError {
  constructor(
    message = "Multi-factor authentication is required to authenticate.",
  ) {
    super(message);
  }
}

/** The authenticated principal lacks the required permission. HTTP 403. */
export class ForbiddenError extends AuthError {}

/**
 * The session is bound to a different tenant than the one being acted upon.
 * Closes the forged-tenant path for authenticated routes. HTTP 403.
 */
export class TenantMismatchError extends ForbiddenError {}
