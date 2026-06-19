import { randomBytes } from "node:crypto";
import { ForbiddenError } from "@eqa/auth";
import { AiReviewService, LocalStubModelAdapter } from "@eqa/ai";
import { loadBundledCatalog, type ContentPin } from "@eqa/content";
import { LocalKms } from "@eqa/crypto";
import { InMemoryJobQueue } from "@eqa/jobs";
import type { TenantDescriptor } from "@eqa/tenant";
import {
  AI_GAP_FLAG_JOB,
  createGapFlaggingHandler,
  DraftAlreadyReviewedError,
  GapFlaggingEngine,
  HumanReviewEngine,
  IllegalReviewStateError,
  IllegalStatusTransitionError,
  isFinalConclusion,
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

const PACK_ID = "eqa-foundations";
const PACK_VERSION = "1.0.0";
const ASSESSMENT = "assessment-1";
const STANDARD = "1.1";
const QUESTION = "Q-1-1-1";
const KEY = `${ASSESSMENT}::${QUESTION}`;

/**
 * End-to-end Step 11: human reviewer workflow composed with Step 10 AI drafts,
 * Step 8 status machine, and Step 4 audit log. Synthetic data only.
 */
describe("Human reviewer workflow composed end-to-end (Step 11)", () => {
  let db: Database;
  let registry: TenantRegistry;
  let queue: InMemoryJobQueue;
  let catalog: ReturnType<typeof loadBundledCatalog>;

  beforeEach(async () => {
    db = createInMemoryDatabase();
    registry = new TenantRegistry(db, new LocalKms(randomBytes(32), "test"));
    await migrateShared(db);
    catalog = loadBundledCatalog();
    const engine = new GapFlaggingEngine(
      new AiReviewService(new LocalStubModelAdapter()),
    );
    queue = new InMemoryJobQueue(
      {
        [AI_GAP_FLAG_JOB]: createGapFlaggingHandler({
          engine,
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

  function gapPayload(pin: ContentPin): GapFlaggingPayload {
    return {
      questionId: QUESTION,
      standardNumber: STANDARD,
      pin,
      evidence: {
        excerpts: ["The function maintains a documented code of ethics."],
        identities: [],
      },
    };
  }

  /** Runs the Step 10 gap-flag job and returns the persisted draft's id. */
  async function aiFlagItem(t: TenantDescriptor): Promise<string> {
    await submitEvidence(t);
    await queue.enqueue({
      name: AI_GAP_FLAG_JOB,
      tenant: contextOf(t),
      payload: gapPayload(pinFor()),
    });
    await queue.onIdle();

    const drafts = await reposFor(t).draftFindings.getForAssessment(ASSESSMENT);
    const findingId = drafts[0]?.findingId;
    if (!findingId) throw new Error("expected a persisted draft finding");
    return findingId;
  }

  it("accept: draft becomes final conclusion and item moves to gap_confirmed", async () => {
    const acme = await tenant("acme-co");
    const findingId = await aiFlagItem(acme);
    const repos = reposFor(acme);
    const engine = new HumanReviewEngine(repos.humanReview);

    const result = await engine.review({ findingId, action: "accept" });

    expect(result.finalItemStatus).toBe("gap_confirmed");
    expect(result.outcome.finalConclusion).not.toBeNull();
    expect(isFinalConclusion(result.outcome.finalConclusion)).toBe(true);

    const finals = await repos.humanReview.getForAssessment(ASSESSMENT);
    expect(finals).toHaveLength(1);
    expect(finals[0]?.conclusion).toBe(result.outcome.originalDraftSummary);
    expect(
      (await repos.itemStatus.getStatus(ASSESSMENT, QUESTION))?.status,
    ).toBe("gap_confirmed");
  });

  it("reject: no final conclusion and item moves to reviewed_no_gap", async () => {
    const acme = await tenant("acme-co");
    const findingId = await aiFlagItem(acme);
    const repos = reposFor(acme);
    const engine = new HumanReviewEngine(repos.humanReview);

    const result = await engine.review({ findingId, action: "reject" });

    expect(result.finalItemStatus).toBe("reviewed_no_gap");
    expect(result.outcome.finalConclusion).toBeNull();
    expect(await repos.humanReview.getForAssessment(ASSESSMENT)).toEqual([]);
    expect(
      (await repos.itemStatus.getStatus(ASSESSMENT, QUESTION))?.status,
    ).toBe("reviewed_no_gap");
  });

  it("edit_accept: reviewer's edited text becomes the final conclusion", async () => {
    const acme = await tenant("acme-co");
    const findingId = await aiFlagItem(acme);
    const repos = reposFor(acme);
    const engine = new HumanReviewEngine(repos.humanReview);
    const edited = "Reviewer-edited final: ethics gap confirmed with nuance.";

    const result = await engine.review({
      findingId,
      action: "edit_accept",
      editedConclusion: edited,
    });

    expect(result.finalItemStatus).toBe("gap_confirmed");
    expect(result.outcome.editedText).toBe(edited);
    const finals = await repos.humanReview.getForAssessment(ASSESSMENT);
    expect(finals[0]?.conclusion).toBe(edited);
    expect(finals[0]?.conclusion).not.toBe(result.outcome.originalDraftSummary);
  });

  it("no final conclusion exists before human review — only the review workflow creates one", async () => {
    const acme = await tenant("acme-co");
    await aiFlagItem(acme);
    const repos = reposFor(acme);

    expect(await repos.humanReview.getForAssessment(ASSESSMENT)).toEqual([]);
  });

  it("forbids a Board user from reviewing a draft", async () => {
    const acme = await tenant("acme-co");
    const findingId = await aiFlagItem(acme);
    const board = reposFor(acme, "board");
    const engine = new HumanReviewEngine(board.humanReview);

    await expect(
      engine.review({ findingId, action: "accept" }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    expect(await board.humanReview.getForAssessment(ASSESSMENT)).toEqual([]);
    expect(
      (await board.itemStatus.getStatus(ASSESSMENT, QUESTION))?.status,
    ).toBe("ai_flagged");
  });

  it("allows Audit Staff to review", async () => {
    const acme = await tenant("acme-co");
    const findingId = await aiFlagItem(acme);
    const staff = reposFor(acme, "audit_staff");
    const engine = new HumanReviewEngine(staff.humanReview);

    await expect(
      engine.review({ findingId, action: "accept" }),
    ).resolves.toBeDefined();
  });

  it("rejects illegal status shortcuts at the data layer during review transitions", async () => {
    const acme = await tenant("acme-co");
    const findingId = await aiFlagItem(acme);
    const repos = reposFor(acme);

    // Manually skip ahead — illegal from ai_flagged.
    await expect(
      repos.itemStatus.transition({
        assessmentId: ASSESSMENT,
        questionId: QUESTION,
        to: "gap_confirmed",
      }),
    ).rejects.toBeInstanceOf(IllegalStatusTransitionError);

    // Review still works through the legal path.
    const engine = new HumanReviewEngine(repos.humanReview);
    await expect(
      engine.review({ findingId, action: "accept" }),
    ).resolves.toBeDefined();
  });

  it("rejects review when the item is not ai_flagged", async () => {
    const acme = await tenant("acme-co");
    const findingId = await aiFlagItem(acme);
    const repos = reposFor(acme);

    // Move past ai_flagged without going through the review workflow.
    await repos.itemStatus.transition({
      assessmentId: ASSESSMENT,
      questionId: QUESTION,
      to: "under_human_review",
    });

    const engine = new HumanReviewEngine(repos.humanReview);
    await expect(
      engine.review({ findingId, action: "accept" }),
    ).rejects.toBeInstanceOf(IllegalReviewStateError);
  });

  it("rejects reviewing the same draft twice", async () => {
    const acme = await tenant("acme-co");
    const findingId = await aiFlagItem(acme);
    const engine = new HumanReviewEngine(reposFor(acme).humanReview);

    await engine.review({ findingId, action: "reject" });
    await expect(
      engine.review({ findingId, action: "accept" }),
    ).rejects.toBeInstanceOf(DraftAlreadyReviewedError);
  });

  it("records a reconstructable decision trail in the audit log with provenance intact", async () => {
    const acme = await tenant("acme-co");
    const findingId = await aiFlagItem(acme);
    const repos = reposFor(acme);
    const draft = (await repos.draftFindings.getById(findingId))!;

    const engine = new HumanReviewEngine(repos.humanReview);
    await engine.review({
      findingId,
      action: "edit_accept",
      editedConclusion: "Edited synthetic final conclusion.",
    });

    const entries = (await repos.audit.list()).sort((a, b) => a.seq - b.seq);

    const draftCreate = entries.find(
      (e) => e.entity === "draft_finding" && e.action === "create",
    );
    expect(draftCreate).toBeDefined();
    const draftRecorded = JSON.parse(draftCreate?.newValue ?? "null") as {
      promptVersion: string;
      rubricVersion: string;
      status: string;
    };
    expect(draftRecorded.status).toBe("draft");
    expect(draftRecorded.promptVersion).toBe(draft.provenance.promptVersion);
    expect(draftRecorded.rubricVersion).toBe(PACK_VERSION);

    const reviewDecision = entries.find(
      (e) => e.entity === "human_review_decision" && e.action === "create",
    );
    expect(reviewDecision).toBeDefined();
    const decision = JSON.parse(reviewDecision?.newValue ?? "null") as {
      action: string;
      editedText: string;
      finalConclusion: string;
      promptVersion: string;
      rubricVersion: string;
      modelAdapter: string;
      contentPin: { contentHash: string };
      itemStatus: ItemStatus;
    };
    expect(decision.action).toBe("edit_accept");
    expect(decision.editedText).toBe("Edited synthetic final conclusion.");
    expect(decision.finalConclusion).toBe("Edited synthetic final conclusion.");
    expect(decision.promptVersion).toBe(draft.provenance.promptVersion);
    expect(decision.rubricVersion).toBe(PACK_VERSION);
    expect(decision.modelAdapter).toBe("local-stub");
    expect(decision.contentPin.contentHash).toBe(draft.contentPin.contentHash);
    expect(decision.itemStatus).toBe("gap_confirmed");

    const statusPath = entries
      .filter(
        (e) => e.entity === "assessment_item_status" && e.entityId === KEY,
      )
      .sort((a, b) => a.seq - b.seq)
      .map((e) => {
        const parsed = JSON.parse(e.newValue ?? "null") as
          | ItemStatus
          | { status: ItemStatus };
        return typeof parsed === "string" ? parsed : parsed.status;
      });

    // AI flag → human review → gap confirmed (the full item journey).
    expect(statusPath).toContain("ai_flagged");
    expect(statusPath).toContain("under_human_review");
    expect(statusPath).toContain("gap_confirmed");

    expect((await repos.audit.verify()).valid).toBe(true);
  });
});
