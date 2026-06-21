import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession } from "@eqa/auth";

const getServerSessionFromRequest = vi.fn();
const enqueueUiActionJob = vi.fn();
const isRealWritesEnabled = vi.fn();

vi.mock("@/lib/auth/get-server-session", () => ({
  getServerSessionFromRequest,
}));

vi.mock("@/lib/jobs", () => ({
  enqueueUiActionJob,
}));

vi.mock("@/lib/real-writes", () => ({
  isRealWritesEnabled,
}));

const caeSession: AuthSession = {
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

describe("handleUiActionRoute", () => {
  beforeEach(() => {
    getServerSessionFromRequest.mockReset();
    enqueueUiActionJob.mockReset();
    isRealWritesEnabled.mockReset();
    isRealWritesEnabled.mockReturnValue(true);
  });

  it("fails closed without a tenant-scoped session", async () => {
    getServerSessionFromRequest.mockResolvedValue(null);
    const { handleUiActionRoute } = await import("./ui-action-route");

    const response = await handleUiActionRoute(
      "workflow:record-conformance",
      new Request("http://localhost/api/actions/record-conformance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklistId: "c1", checklistItemId: "i1" }),
      }),
      (body) => body,
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "authentication_required",
    });
    expect(enqueueUiActionJob).not.toHaveBeenCalled();
  });

  it("enqueues record-conformance with a verified CAE session", async () => {
    getServerSessionFromRequest.mockResolvedValue(caeSession);
    enqueueUiActionJob.mockResolvedValue({ checklistId: "c1" });
    const { handleUiActionRoute } = await import("./ui-action-route");

    const response = await handleUiActionRoute(
      "workflow:record-conformance",
      new Request("http://localhost/api/actions/record-conformance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: "Bearer test-token",
        },
        body: JSON.stringify({
          checklistId: "c1",
          checklistItemId: "i1",
          conformance: "conforms",
        }),
      }),
      (body, session) => ({
        ...body,
        userId: session.userId,
        role: session.role,
      }),
    );

    expect(response.status).toBe(200);
    expect(enqueueUiActionJob).toHaveBeenCalledWith(
      "workflow:record-conformance",
      caeSession,
      expect.objectContaining({
        checklistId: "c1",
        checklistItemId: "i1",
        conformance: "conforms",
        userId: "cae-user",
        role: "cae",
      }),
    );
  });
});
