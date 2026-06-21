import { beforeEach, describe, expect, it, vi } from "vitest";

const authenticate = vi.fn();
const cookies = vi.fn();
const headers = vi.fn();
const resolveSealedSession = vi.fn();

vi.mock("@eqa/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@eqa/auth")>();
  return {
    ...actual,
    authenticate,
  };
});

vi.mock("next/headers", () => ({
  cookies,
  headers,
}));

vi.mock("./resolve-sealed-session", () => ({
  resolveSealedSession,
}));

vi.mock("./resolve-provider", () => ({
  resolveIdentityProvider: vi.fn(async () => ({ verify: vi.fn() })),
}));

vi.mock("../tenant-gate", () => ({
  getTenantDirectory: vi.fn(() => ({ findBySlug: vi.fn() })),
}));

const caeSession = {
  userId: "cae-user",
  role: "cae",
  mfaAuthenticated: true,
  tenant: {
    tenantId: "tenant-1",
    slug: "seera-pilot",
    name: "Seera-pilot",
    schemaName: "tenant_seera_pilot",
  },
};

describe("getServerSessionFromRequest", () => {
  beforeEach(() => {
    authenticate.mockReset();
    cookies.mockReset();
    headers.mockReset();
    resolveSealedSession.mockReset();
    cookies.mockResolvedValue({
      get: () => undefined,
      set: vi.fn(),
    });
    headers.mockResolvedValue({
      get: () => null,
    });
  });

  it("resolves the session cookie before falling back to bearer", async () => {
    resolveSealedSession.mockResolvedValue({
      payload: { accessToken: "cookie-token", expiresAt: 9999999999 },
      sealed: "sealed-cookie",
      refreshed: false,
    });
    authenticate.mockResolvedValue(caeSession);
    cookies.mockResolvedValue({
      get: () => ({ value: "sealed-cookie" }),
      set: vi.fn(),
    });

    const { getServerSessionFromRequest } = await import("./get-server-session");
    const session = await getServerSessionFromRequest(
      new Request("http://localhost/api/actions/human-review", {
        headers: { authorization: "Bearer forwarded-token" },
      }),
    );

    expect(session?.userId).toBe("cae-user");
    expect(authenticate).toHaveBeenCalledWith(
      "cookie-token",
      expect.anything(),
      expect.anything(),
    );
  });

  it("persists a refreshed session cookie", async () => {
    const set = vi.fn();
    resolveSealedSession.mockResolvedValue({
      payload: { accessToken: "fresh-token", expiresAt: 9999999999 },
      sealed: "refreshed-sealed",
      refreshed: true,
    });
    authenticate.mockResolvedValue(caeSession);
    cookies.mockResolvedValue({
      get: () => ({ value: "old-sealed" }),
      set,
    });

    const { getServerSessionFromRequest } = await import("./get-server-session");
    await getServerSessionFromRequest(
      new Request("http://localhost/api/actions/record-conformance"),
    );

    expect(set).toHaveBeenCalledWith(
      "eqa_session",
      "refreshed-sealed",
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it("falls back to bearer when the cookie cannot be resolved", async () => {
    resolveSealedSession.mockResolvedValue(null);
    authenticate.mockResolvedValue(caeSession);

    const { getServerSessionFromRequest } = await import("./get-server-session");
    const session = await getServerSessionFromRequest(
      new Request("http://localhost/api/actions/record-conformance", {
        headers: { authorization: "Bearer forwarded-token" },
      }),
    );

    expect(session?.userId).toBe("cae-user");
    expect(authenticate).toHaveBeenCalledWith(
      "forwarded-token",
      expect.anything(),
      expect.anything(),
    );
  });
});
