import { randomBytes } from "node:crypto";
import { AiReviewService, LocalStubModelAdapter } from "@eqa/ai";
import { loadBundledCatalog, type ContentPin } from "@eqa/content";
import { LocalKms } from "@eqa/crypto";
import { InMemoryJobQueue } from "@eqa/jobs";
import type { TenantDescriptor } from "@eqa/tenant";
import {
  AI_GAP_FLAG_JOB,
  createGapFlaggingHandler,
  GAP_FLAG_PROMPT_VERSION,
  GapFlaggingEngine,
  IllegalStatusTransitionError,
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
 * Composes the Step 10 gap-flagging job end-to-end: the pure engine (running the
 * Step 9 inference layer over the Step 5 pinned rubric), the Step 6.5 queue, the
 * REAL Step 4 tenant job-audit port, and the data-layer sink that persists the
 * draft and flips the item to AI Flagged (Step 8). Synthetic content + evidence
 * only.
 */
describe("AI gap-flagging engine composed end-to-end (Step 10)", () => {
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

  function reposFor(t: TenantDescriptor, role: "cae" | "board" = "cae") {
    return createTenantRepositories(db, sessionFor(contextOf(t), role));
  }

  function pinFor(): ContentPin {
    return catalog.pinForAssessment(ASSESSMENT, PACK_ID, PACK_VERSION);
  }

  /** Drives the item to evidence_submitted, the only state AI-flagging starts from. */
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

  function payload(pin: ContentPin): GapFlaggingPayload {
    return {
      questionId: QUESTION,
      standardNumber: STANDARD,
      pin,
      evidence: {
        excerpts: ["The function maintains a documented code of ethics."],
        identities: [{ name: "Sara Ahmed", role: "audit_staff" }],
      },
    };
  }

  it("drafts a finding, persists it (draft + provenance + pin), and flips the item to AI Flagged", async () => {
    const acme = await tenant("acme-co");
    await submitEvidence(acme);
    const pin = pinFor();

    await queue.enqueue({
      name: AI_GAP_FLAG_JOB,
      tenant: contextOf(acme),
      payload: payload(pin),
    });
    await queue.onIdle();

    const repos = reposFor(acme);

    // Producing the draft moved the item into AI Flagged (Step 8).
    expect(
      (await repos.itemStatus.getStatus(ASSESSMENT, QUESTION))?.status,
    ).toBe("ai_flagged");

    // The draft finding is persisted, typed as draft, with rule-12 provenance
    // and the content pin tying it to the exact rubric version.
    const findings = await repos.draftFindings.getForAssessment(ASSESSMENT);
    expect(findings).toHaveLength(1);
    const draft = findings[0];
    expect(draft?.kind).toBe("draft_finding");
    expect(draft?.status).toBe("draft");
    expect(draft?.requiresHumanReview).toBe(true);
    expect(draft?.standardNumber).toBe(STANDARD);
    expect(draft?.draftSummary.length).toBeGreaterThan(0);
    expect(draft?.provenance.promptVersion).toBe(GAP_FLAG_PROMPT_VERSION);
    expect(draft?.provenance.rubricVersion).toBe(PACK_VERSION);
    expect(draft?.provenance.modelAdapter).toBe("local-stub");
    expect(draft?.provenance.adapterLocation).toBe("local");
    expect(draft?.contentPin.contentPackId).toBe(PACK_ID);
    expect(draft?.contentPin.version).toBe(PACK_VERSION);
    expect(draft?.contentPin.contentHash).toBe(pin.contentHash);
  });

  it("audits the draft creation, the AI-flag status change, and the model call provenance into the tenant log", async () => {
    const acme = await tenant("acme-co");
    await submitEvidence(acme);

    await queue.enqueue({
      name: AI_GAP_FLAG_JOB,
      tenant: contextOf(acme),
      payload: payload(pinFor()),
    });
    await queue.onIdle();

    const entries = await reposFor(acme).audit.list();

    const created = entries.find(
      (e) => e.entity === "draft_finding" && e.action === "create",
    );
    expect(created).toBeDefined();

    const statusChange = entries.find((e) => {
      if (e.entity !== "assessment_item_status" || e.entityId !== KEY) {
        return false;
      }
      const parsed = JSON.parse(e.newValue ?? "null") as
        | string
        | { status?: string };
      const status = typeof parsed === "string" ? parsed : parsed.status;
      return status === "ai_flagged";
    });
    expect(statusChange).toBeDefined();
    expect(statusChange?.action).toBe("status_change");

    const jobEntry = entries.find((e) => e.entity === `job:${AI_GAP_FLAG_JOB}`);
    expect(jobEntry).toBeDefined();
    const recorded = JSON.parse(jobEntry?.newValue ?? "null") as {
      status: string;
      output: { promptVersion: string; rubricVersion: string };
    };
    expect(recorded.status).toBe("completed");
    expect(recorded.output.promptVersion).toBe(GAP_FLAG_PROMPT_VERSION);
    expect(recorded.output.rubricVersion).toBe(PACK_VERSION);

    // The tenant's hash-chained log still verifies after all three writes.
    expect((await reposFor(acme).audit.verify()).valid).toBe(true);
  });

  it("a draft cannot be promoted to a final outcome without human review (data layer)", async () => {
    const acme = await tenant("acme-co");
    await submitEvidence(acme);

    await queue.enqueue({
      name: AI_GAP_FLAG_JOB,
      tenant: contextOf(acme),
      payload: payload(pinFor()),
    });
    await queue.onIdle();

    const repos = reposFor(acme);
    const transition = (to: ItemStatus) =>
      repos.itemStatus.transition({
        assessmentId: ASSESSMENT,
        questionId: QUESTION,
        to,
      });

    // From AI Flagged there is NO direct edge to any conclusion — the only legal
    // move is into human review (Step 11). Final outcomes are rejected here.
    await expect(transition("gap_confirmed")).rejects.toBeInstanceOf(
      IllegalStatusTransitionError,
    );
    await expect(transition("reviewed_no_gap")).rejects.toBeInstanceOf(
      IllegalStatusTransitionError,
    );
    await expect(transition("closed_ready")).rejects.toBeInstanceOf(
      IllegalStatusTransitionError,
    );

    // Only human review is reachable; the item is still AI Flagged.
    expect(
      (await repos.itemStatus.getStatus(ASSESSMENT, QUESTION))?.status,
    ).toBe("ai_flagged");
    await expect(transition("under_human_review")).resolves.toBeDefined();
  });

  it("refuses to flag (and persists no draft) when the item has not submitted evidence", async () => {
    const acme = await tenant("acme-co");
    // No evidence submitted: item is at the initial not_assessed state.

    const handle = await queue.enqueue({
      name: AI_GAP_FLAG_JOB,
      tenant: contextOf(acme),
      payload: payload(pinFor()),
    });
    await queue.onIdle();

    // The job failed closed: not_assessed → ai_flagged is not a legal move.
    expect((await queue.getStatus(handle.id))?.status).toBe("failed");

    const repos = reposFor(acme);
    expect(await repos.draftFindings.getForAssessment(ASSESSMENT)).toEqual([]);
    expect(await repos.itemStatus.getStatus(ASSESSMENT, QUESTION)).toBeNull();
  });

  it("isolates draft findings and status per tenant", async () => {
    const acme = await tenant("acme-co");
    const beta = await tenant("beta-co");
    await submitEvidence(acme);

    await queue.enqueue({
      name: AI_GAP_FLAG_JOB,
      tenant: contextOf(acme),
      payload: payload(pinFor()),
    });
    await queue.onIdle();

    // acme has the draft + AI-flagged item; beta is untouched.
    expect(
      await reposFor(acme).draftFindings.getForAssessment(ASSESSMENT),
    ).toHaveLength(1);
    expect(
      await reposFor(beta).draftFindings.getForAssessment(ASSESSMENT),
    ).toEqual([]);
    expect(
      await reposFor(beta).itemStatus.getStatus(ASSESSMENT, QUESTION),
    ).toBeNull();
    expect(
      (await reposFor(beta).audit.list()).some((e) =>
        e.entity.startsWith("job:"),
      ),
    ).toBe(false);
  });
});
