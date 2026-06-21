import type { OidcConfig } from "./config";

export interface OidcTokenResponse {
  readonly access_token: string;
  readonly refresh_token?: string;
  readonly expires_in: number;
  readonly token_type: string;
}

export function buildAuthorizationUrl(
  config: OidcConfig,
  state: string,
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid profile email",
    state,
  });
  return `${config.authorizationEndpoint}?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  config: OidcConfig,
  code: string,
): Promise<OidcTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri,
  });

  const response = await fetch(config.tokenEndpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed (${response.status}).`);
  }

  return response.json() as Promise<OidcTokenResponse>;
}

export async function refreshAccessToken(
  config: OidcConfig,
  refreshToken: string,
): Promise<OidcTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
  });

  const response = await fetch(config.tokenEndpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed (${response.status}).`);
  }

  return response.json() as Promise<OidcTokenResponse>;
}

export function buildLogoutUrl(
  config: OidcConfig,
  postLogoutRedirectUri?: string,
): string {
  const params = new URLSearchParams({ client_id: config.clientId });
  if (postLogoutRedirectUri) {
    params.set("post_logout_redirect_uri", postLogoutRedirectUri);
  }
  return `${config.logoutEndpoint}?${params.toString()}`;
}
