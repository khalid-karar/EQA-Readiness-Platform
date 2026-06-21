import { AiConfigError } from "./errors";

/** Hostnames permitted for the local-llm adapter (never off-box / rule 2). */
export const LOCAL_LLM_ALLOWED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
]);

/**
 * Normalizes and validates a base URL for the local Ollama endpoint. Rejects any
 * host outside the localhost allowlist so evidence cannot be routed to an external
 * frontier API via misconfiguration.
 */
export function assertLocalLlmBaseUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new AiConfigError(`AI_BASE_URL is not a valid URL: '${raw}'.`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new AiConfigError(
      `AI_BASE_URL must use http or https, not '${url.protocol}'.`,
    );
  }

  if (!LOCAL_LLM_ALLOWED_HOSTS.has(url.hostname)) {
    throw new AiConfigError(
      `AI_BASE_URL host '${url.hostname}' is not permitted. Local LLM must stay on-box (localhost only).`,
    );
  }

  return url.origin;
}

/** Returns true when the URL points to an allowed local host. */
export function isAllowedLocalLlmUrl(raw: string): boolean {
  try {
    assertLocalLlmBaseUrl(raw);
    return true;
  } catch {
    return false;
  }
}
