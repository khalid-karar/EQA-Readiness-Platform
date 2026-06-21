import type { AuthSession } from "@eqa/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getServerSessionFromRequest = vi.fn();
const getServerSession = vi.fn();
const enqueueUiActionJob = vi.fn();
const isRealWritesEnabled = vi.fn();

vi.mock("@/lib/auth/get-server-session", () => ({
  getServerSessionFromRequest,
  getServerSession,
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

const uiActionRoutes = [
  {
    name: "human-review",
    importPath: "@/app/api/actions/human-review/route",
    body: { findingId: "f1", action: "approve" },
  },
  {
    name: "submit-response",
    importPath: "@/app/api/actions/submit-response/route",
    body: {
      assessmentId: "a1",
      questionId: "q1",
      answer: "yes",
      pin: {},
    },
  },
  {
    name: "record-conformance",
    importPath: "@/app/api/actions/record-conformance/route",
    body: {
      checklistId: "c1",
      checklistItemId: "i1",
      conformance: "conforms",
    },
  },
  {
    name: "remediation",
    importPath: "@/app/api/actions/remediation/route",
    body: { remediationId: "r1", transition: "start" },
  },
] as const;

describe("UI action routes auth", () => {
  beforeEach(() => {
    getServerSessionFromRequest.mockReset();
    enqueueUiActionJob.mockReset();
    isRealWritesEnabled.mockReset();
    isRealWritesEnabled.mockReturnValue(true);
    enqueueUiActionJob.mockResolvedValue({ ok: true });
  });

  it.each(uiActionRoutes)(
    "$name fails closed without a verified session",
    async ({ importPath, body }) => {
      getServerSessionFromRequest.mockResolvedValue(null);
      const route = await import(importPath);

      const response = await route.POST(
        new Request(`http://localhost/api/actions/${importPath}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      );

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({
        error: "authentication_required",
      });
      expect(enqueueUiActionJob).not.toHaveBeenCalled();
    },
  );

  it.each(uiActionRoutes)(
    "$name succeeds with a verified CAE session",
    async ({ importPath, body }) => {
      getServerSessionFromRequest.mockResolvedValue(caeSession);
      const route = await import(importPath);

      const response = await route.POST(
        new Request(`http://localhost/api/actions/${importPath}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: "Bearer verified-token",
          },
          body: JSON.stringify(body),
        }),
      );

      expect(response.status).toBe(200);
      expect(enqueueUiActionJob).toHaveBeenCalled();
    },
  );
});

describe("report action routes auth", () => {
  beforeEach(() => {
    getServerSession.mockReset();
    isRealWritesEnabled.mockReset();
    isRealWritesEnabled.mockReturnValue(true);
  });

  const reportRoutes = [
    {
      name: "run-mock-eqa",
      importPath: "@/app/api/actions/run-mock-eqa/route",
      body: {},
    },
    {
      name: "generate-evidence-pack",
      importPath: "@/app/api/actions/generate-evidence-pack/route",
      body: {},
    },
  ] as const;

  it.each(reportRoutes)(
    "$name fails closed without a verified session",
    async ({ importPath, body }) => {
      getServerSession.mockResolvedValue(null);
      const route = await import(importPath);

      const response = await route.POST(
        new Request(`http://localhost/api/actions/${importPath}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      );

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ error: "Unauthorized." });
    },
  );
});
