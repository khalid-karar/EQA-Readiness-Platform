import type { IdentityProvider } from "@eqa/auth";
import { getMiddlewareIdentityProvider } from "../tenant-gate";

let cachedE2eProvider: IdentityProvider | undefined;

/** Identity provider for middleware and server session verification. */
export async function resolveIdentityProvider(): Promise<IdentityProvider> {
  if (process.env.EQA_E2E_TEST_AUTH === "true") {
    if (!cachedE2eProvider) {
      const { getStaticTestProvider } = await import("@eqa/auth/testing/tokens");
      cachedE2eProvider = (await getStaticTestProvider()).provider;
    }
    return cachedE2eProvider;
  }

  return getMiddlewareIdentityProvider();
}

/** Test hook — reset cached E2E provider between tests. */
export function resetE2eIdentityProviderForTests(): void {
  cachedE2eProvider = undefined;
}
