export interface OidcConfig {
  readonly issuer: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly appUrl: string;
  readonly sessionSecret: string;
  readonly authorizationEndpoint: string;
  readonly tokenEndpoint: string;
  readonly logoutEndpoint: string;
  readonly redirectUri: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for authentication.`);
  }
  return value;
}

/** OIDC + session settings for the web app (server-only). */
export function getOidcConfig(): OidcConfig {
  const issuer = requireEnv("KEYCLOAK_ISSUER").replace(/\/$/, "");
  const clientId = requireEnv("KEYCLOAK_AUDIENCE");
  const clientSecret = requireEnv("KEYCLOAK_CLIENT_SECRET");
  const sessionSecretRaw = requireEnv("AUTH_SESSION_SECRET");
  const appUrl = (
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");

  const sessionSecret = sessionSecretRaw;
  if (sessionSecret.length < 32) {
    throw new Error(
      "AUTH_SESSION_SECRET must be at least 32 bytes for session encryption.",
    );
  }

  return {
    issuer,
    clientId,
    clientSecret,
    appUrl,
    sessionSecret,
    authorizationEndpoint: `${issuer}/protocol/openid-connect/auth`,
    tokenEndpoint: `${issuer}/protocol/openid-connect/token`,
    logoutEndpoint: `${issuer}/protocol/openid-connect/logout`,
    redirectUri: `${appUrl}/auth/callback`,
  };
}
