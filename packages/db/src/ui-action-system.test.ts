import { randomBytes } from "node:crypto";
import { AiReviewService, LocalStubModelAdapter } from "@eqa/ai";
import {
  loadBundledCatalog,
  resolveChecklistItems,
  type ContentPin,
  type ReviewChecklistPin,
} from "@eqa/content";
import { LocalKms } from "@eqa/crypto";
import { InMemoryJobQueue } from "@eqa/jobs";
import type { TenantDescriptor } from "@eqa/tenant";
import {
  AI_GAP_FLAG_JOB,
  createGapFlaggingHandler,
  GapFlaggingEngine,
  HUMAN_REVIEW_JOB,
  RECORD_CONFORMANCE_JOB,
  REMEDIATION_TRANSITION_JOB,
  ASSIGN_REMEDIATION_JOB,
  UPDATE_REMEDIATION_PLAN_JOB,
  SUBMIT_RESPONSE_JOB,
  type GapFlaggingPayload,
  type ItemStatus,
} from "@eqa/workflows";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Database } from "./database";
import { createTenantJobAuditPort } from "./evidence-system";
import { createGapFlagSink } from "./gap-flag-system";
import { migrateShared } from "./migrate";
import { TenantRegistry } from "./registry";
import { createTenantRepositories } from "./repositories";
import { contextOf, sessionFor } from "./testing/fixtures";
import { createInMemoryDatabase } from "./testing/in-memory";
import { createUiActionHandlers } from "./ui-action-system";

const PACK_ID = "eqa-foundations";
const PACK_VERSION = "1.0.0";
const ASSESSMENT = "assessment-1";
const STANDARD = "1.1";
const QUESTION = "Q-1-1-1";
const REM_QUESTION = "Q-1-2-1";
const REM_STANDARD = "1.2";

describe("UI action job handlers (tenant-scoped mutations)", () => {
  let db: Database;
  let registry: TenantRegistry;
  let queue: InMemoryJobQueue;
  let catalog: ReturnType<typeof loadBundledCatalog>;

  beforeEach(async () => {
    db = createInMemoryDatabase();
    registry = new TenantRegistry(db, new LocalKms(randomBytes(32), "test"));
    await migrateShared(db);
    catalog = loadBundledCatalog();
    const gapEngine = new GapFlaggingEngine(
      new AiReviewService(new LocalStubModelAdapter()),
    );
    queue = new InMemoryJobQueue(
      {
        ...createUiActionHandlers(db),
        [AI_GAP_FLAG_JOB]: createGapFlaggingHandler({
          engine: gapEngine,
          catalog,
          sink: createGapFlagSink(db),
        }),
      },
      { auditPort: createTenantJobAuditPort(db) },
    );
  });

  afterEach(async () => {
    await db.close();
  });

  function tenant(slug: string): Promise<TenantDescriptor> {
    return registry.createTenant({ slug, name: slug });
  }

  function reposFor(
    t: TenantDescriptor,
    role: "cae" | "audit_staff" | "board" = "cae",
  ) {
    return createTenantRepositories(db, sessionFor(contextOf(t), role));
  }

  function pinFor(): ContentPin {
    return catalog.pinForAssessment(ASSESSMENT, PACK_ID, PACK_VERSION);
  }

  async function enqueueAndRun(
    t: TenantDescriptor,
    name: string,
    payload: Record<string, unknown>,
    role: "cae" | "audit_staff" | "board" = "cae",
  ) {
    const session = sessionFor(contextOf(t), role);
    const { id } = await queue.enqueue({
      name,
      tenant: contextOf(t),
      payload: {
        ...payload,
        userId: session.userId,
        role: session.role,
      },
    });
    await queue.onIdle();
    return queue.getStatus(id);
  }

  async function submitEvidence(t: TenantDescriptor): Promise<void> {
    const repos = reposFor(t);
    await repos.itemStatus.transition({
      assessmentId: ASSESSMENT,
      questionId: QUESTION,
      to: "evidence_requested",
    });
    await repos.itemStatus.transition({
      assessmentId: ASSESSMENT,
      questionId: QUESTION,
      to: "evidence_submitted",
    });
  }

  async function aiFlagItem(t: TenantDescriptor): Promise<string> {
    await submitEvidence(t);
    const pin = pinFor();
    const payload: GapFlaggingPayload = {
      questionId: QUESTION,
      standardNumber: STANDARD,
      pin,
      evidence: {
        excerpts: ["The function maintains a documented code of ethics."],
        identities: [],
      },
    };
    await enqueueAndRun(
      t,
      AI_GAP_FLAG_JOB,
      payload as unknown as Record<string, unknown>,
    );
    const drafts = await reposFor(t).draftFindings.getForAssessment(ASSESSMENT);
    const findingId = drafts[0]?.findingId;
    if (!findingId) throw new Error("expected draft finding");
    return findingId;
  }

  async function seedGapConfirmed(
    repos: ReturnType<typeof createTenantRepositories>,
    questionId = REM_QUESTION,
  ): Promise<void> {
    const path: ItemStatus[] = [
      "evidence_requested",
      "evidence_submitted",
      "ai_flagged",
      "under_human_review",
      "gap_confirmed",
    ];
    for (const to of path) {
      await repos.itemStatus.transition({
        assessmentId: ASSESSMENT,
        questionId,
        to,
      });
    }
  }

  async function seedWorkingPaperChecklist(t: TenantDescriptor) {
    const repos = reposFor(t);
    const pack = catalog.get(PACK_ID, PACK_VERSION);
    const reviewPin: ReviewChecklistPin = {
      contentPackId: pack.meta.contentPackId,
      version: pack.meta.version,
      contentHash: pack.contentHash,
    };
    const engagement = await repos.workingPaperReview.createEngagement({
      title: "Synthetic FY2025 Internal Audit",
      periodStart: "2025-01-01",
      periodEnd: "2025-12-31",
    });
    const file = await repos.workingPaperReview.createFile({
      engagementId: engagement.engagementId,
      name: "Ethics Working Papers",
    });
    const paper = await repos.workingPaperReview.createWorkingPaper({
      fileId: file.fileId,
      reference: "WP-1.1",
      title: "Code of Ethics Review",
    });
    const checklist = await repos.workingPaperReview.createChecklist({
      workingPaperId: paper.workingPaperId,
      standardNumber: STANDARD,
      pin: reviewPin,
    });
    const itemId =
      resolveChecklistItems(catalog, reviewPin, STANDARD)[0]?.id ?? "";
    return { checklistId: checklist.checklistId, checklistItemId: itemId };
  }

  describe("submit response", () => {
    it("persists a pinned questionnaire response and writes audit", async () => {
      const acme = await tenant("acme-co");
      const repos = reposFor(acme);
      const beforeAudit = await repos.audit.list();

      const status = await enqueueAndRun(acme, SUBMIT_RESPONSE_JOB, {
        assessmentId: ASSESSMENT,
        questionId: QUESTION,
        answer: "4",
        note: "Self-rating",
        pin: pinFor(),
      });
      expect(status?.status).toBe("completed");

      const responses = await repos.responses.getForAssessment(ASSESSMENT);
      expect(responses).toHaveLength(1);
      expect(responses[0]?.answer).toBe("4");
      expect(responses[0]?.pin.contentPackId).toBe(PACK_ID);

      const afterAudit = await repos.audit.list();
      expect(afterAudit.length).toBeGreaterThan(beforeAudit.length);
    });

    it("rejects cross-tenant reads of another tenant's responses", async () => {
      const acme = await tenant("acme-co");
      const beta = await tenant("beta-co");
      await enqueueAndRun(acme, SUBMIT_RESPONSE_JOB, {
        assessmentId: ASSESSMENT,
        questionId: QUESTION,
        answer: "3",
        pin: pinFor(),
      });

      expect(
        await reposFor(beta).responses.getForAssessment(ASSESSMENT),
      ).toEqual([]);
    });
  });

  describe("human review", () => {
    it("persists final conclusion via createFinalConclusion path and audits", async () => {
      const acme = await tenant("acme-co");
      const repos = reposFor(acme);
      const findingId = await aiFlagItem(acme);
      const beforeAudit = await repos.audit.list();

      const status = await enqueueAndRun(acme, HUMAN_REVIEW_JOB, {
        findingId,
        action: "accept",
      });
      expect(status?.status).toBe("completed");
      expect(status?.result).toMatchObject({ itemStatus: "gap_confirmed" });

      const finals = await repos.humanReview.getForAssessment(ASSESSMENT);
      expect(finals).toHaveLength(1);
      expect(
        (await repos.itemStatus.getStatus(ASSESSMENT, QUESTION))?.status,
      ).toBe("gap_confirmed");

      const afterAudit = await repos.audit.list();
      expect(afterAudit.length).toBeGreaterThan(beforeAudit.length);
    });

    it("rejects illegal review when item is not ai_flagged", async () => {
      const acme = await tenant("acme-co");
      const repos = reposFor(acme);
      const findingId = await aiFlagItem(acme);
      await repos.itemStatus.transition({
        assessmentId: ASSESSMENT,
        questionId: QUESTION,
        to: "under_human_review",
      });

      const status = await enqueueAndRun(acme, HUMAN_REVIEW_JOB, {
        findingId,
        action: "reject",
      });
      expect(status?.status).toBe("failed");
      expect(status?.error).toContain("ai_flagged");
    });

    it("isolates review outcomes per tenant", async () => {
      const acme = await tenant("acme-co");
      const beta = await tenant("beta-co");
      const findingId = await aiFlagItem(acme);
      await enqueueAndRun(acme, HUMAN_REVIEW_JOB, {
        findingId,
        action: "accept",
      });

      expect(await reposFor(beta).humanReview.getForAssessment(ASSESSMENT)).toEqual(
        [],
      );
    });
  });

  describe("record conformance", () => {
    it("persists checklist conformance against pinned content and audits", async () => {
      const acme = await tenant("acme-co");
      const repos = reposFor(acme);
      const { checklistId, checklistItemId } = await seedWorkingPaperChecklist(acme);
      const beforeAudit = await repos.audit.list();

      const status = await enqueueAndRun(acme, RECORD_CONFORMANCE_JOB, {
        checklistId,
        checklistItemId,
        conformance: "does_not_conform",
        note: "Methodology gap",
      });
      expect(status?.status).toBe("completed");

      const results = await repos.workingPaperReview.getResultsForChecklist(
        checklistId,
      );
      expect(results.some((r) => r.checklistItemId === checklistItemId)).toBe(
        true,
      );

      const afterAudit = await repos.audit.list();
      expect(afterAudit.length).toBeGreaterThan(beforeAudit.length);
    });

    it("does not leak conformance records across tenants", async () => {
      const acme = await tenant("acme-co");
      const beta = await tenant("beta-co");
      const { checklistId, checklistItemId } = await seedWorkingPaperChecklist(acme);
      await enqueueAndRun(acme, RECORD_CONFORMANCE_JOB, {
        checklistId,
        checklistItemId,
        conformance: "conforms",
      });

      const betaHierarchy = await seedWorkingPaperChecklist(beta);
      expect(
        await reposFor(beta).workingPaperReview.getResultsForChecklist(
          betaHierarchy.checklistId,
        ),
      ).toEqual([]);
    });
  });

  describe("remediation transition", () => {
    it("persists ready/pass transitions and writes audit", async () => {
      const acme = await tenant("acme-co");
      const repos = reposFor(acme);
      await seedGapConfirmed(repos);
      const item = await repos.remediation.assign({
        assessmentId: ASSESSMENT,
        questionId: REM_QUESTION,
        standardNumber: REM_STANDARD,
        action: "Fix gap",
        owner: "Owner",
        targetDate: "2026-12-31",
      });
      const beforeAudit = await repos.audit.list();

      let status = await enqueueAndRun(acme, REMEDIATION_TRANSITION_JOB, {
        remediationId: item.remediationId,
        transition: "ready",
      });
      expect(status?.status).toBe("completed");
      expect(status?.result).toMatchObject({ itemStatus: "ready_for_retest" });

      status = await enqueueAndRun(acme, REMEDIATION_TRANSITION_JOB, {
        remediationId: item.remediationId,
        transition: "pass",
      });
      expect(status?.status).toBe("completed");
      expect(status?.result).toMatchObject({ itemStatus: "closed_ready" });

      const afterAudit = await repos.audit.list();
      expect(afterAudit.length).toBeGreaterThan(beforeAudit.length);
    });

    it("rejects illegal remediation transition", async () => {
      const acme = await tenant("acme-co");
      const repos = reposFor(acme);
      await seedGapConfirmed(repos);
      const item = await repos.remediation.assign({
        assessmentId: ASSESSMENT,
        questionId: REM_QUESTION,
        standardNumber: REM_STANDARD,
        action: "Fix",
        owner: "Owner",
        targetDate: "2026-12-31",
      });

      const status = await enqueueAndRun(acme, REMEDIATION_TRANSITION_JOB, {
        remediationId: item.remediationId,
        transition: "pass",
      });
      expect(status?.status).toBe("failed");
      expect(status?.error).toMatch(/illegal|transition|ready_for_retest/i);
    });

    it("assigns remediation via job handler and writes audit", async () => {
      const acme = await tenant("acme-co");
      const repos = reposFor(acme);
      await seedGapConfirmed(repos);
      const beforeAudit = await repos.audit.list();

      const status = await enqueueAndRun(acme, ASSIGN_REMEDIATION_JOB, {
        assessmentId: ASSESSMENT,
        questionId: REM_QUESTION,
        standardNumber: REM_STANDARD,
        action: "Fix COI process",
        owner: "audit-staff",
        targetDate: "2026-12-31",
      });
      expect(status?.status).toBe("completed");
      expect(status?.result).toMatchObject({
        itemStatus: "remediation_in_progress",
      });

      const items = await repos.remediation.listForAssessment(ASSESSMENT);
      expect(items.some((i) => i.questionId === REM_QUESTION)).toBe(true);

      const afterAudit = await repos.audit.list();
      expect(afterAudit.length).toBeGreaterThan(beforeAudit.length);
    });

    it("isolates remediation mutations per tenant", async () => {
      const acme = await tenant("acme-co");
      const beta = await tenant("beta-co");
      const repos = reposFor(acme);
      await seedGapConfirmed(repos);
      const item = await repos.remediation.assign({
        assessmentId: ASSESSMENT,
        questionId: REM_QUESTION,
        standardNumber: REM_STANDARD,
        action: "Fix",
        owner: "Owner",
        targetDate: "2026-12-31",
      });
      await enqueueAndRun(acme, REMEDIATION_TRANSITION_JOB, {
        remediationId: item.remediationId,
        transition: "ready",
      });

      expect(
        await reposFor(beta).remediation.listForAssessment(ASSESSMENT),
      ).toEqual([]);
    });
  });

  describe("update remediation plan", () => {
    it("persists owner reassignment while remediation_in_progress", async () => {
      const acme = await tenant("acme-co");
      const repos = reposFor(acme);
      await seedGapConfirmed(repos);
      const item = await repos.remediation.assign({
        assessmentId: ASSESSMENT,
        questionId: REM_QUESTION,
        standardNumber: REM_STANDARD,
        action: "Fix gap",
        owner: "Owner",
        targetDate: "2026-12-31",
      });

      const status = await enqueueAndRun(acme, UPDATE_REMEDIATION_PLAN_JOB, {
        remediationId: item.remediationId,
        owner: "New Owner",
      });
      expect(status?.status).toBe("completed");
      expect(status?.result).toMatchObject({ owner: "New Owner" });

      const updated = await repos.remediation.getById(item.remediationId);
      expect(updated?.owner).toBe("New Owner");
    });

    it("rejects plan update outside remediation_in_progress", async () => {
      const acme = await tenant("acme-co");
      const repos = reposFor(acme);
      await seedGapConfirmed(repos);
      const item = await repos.remediation.assign({
        assessmentId: ASSESSMENT,
        questionId: REM_QUESTION,
        standardNumber: REM_STANDARD,
        action: "Fix",
        owner: "Owner",
        targetDate: "2026-12-31",
      });
      await enqueueAndRun(acme, REMEDIATION_TRANSITION_JOB, {
        remediationId: item.remediationId,
        transition: "ready",
      });

      const status = await enqueueAndRun(acme, UPDATE_REMEDIATION_PLAN_JOB, {
        remediationId: item.remediationId,
        owner: "Too late",
      });
      expect(status?.status).toBe("failed");
      expect(status?.error).toMatch(/remediation_in_progress/i);
    });
  });
});
