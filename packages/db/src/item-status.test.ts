import { randomBytes } from "node:crypto";
import { ForbiddenError } from "@eqa/auth";
import { LocalKms } from "@eqa/crypto";
import type { TenantDescriptor } from "@eqa/tenant";
import { IllegalStatusTransitionError, type ItemStatus } from "@eqa/workflows";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Database } from "./database";
import { migrateShared } from "./migrate";
import { TenantRegistry } from "./registry";
import { createTenantRepositories } from "./repositories";
import { contextOf, sessionFor } from "./testing/fixtures";
import { createInMemoryDatabase } from "./testing/in-memory";

function kms(): LocalKms {
  return new LocalKms(randomBytes(32), "test-master");
}

const ASSESSMENT = "assessment-1";
const QUESTION = "Q-1-1-1";
const KEY = `${ASSESSMENT}::${QUESTION}`;

describe("TenantItemStatusRepository", () => {
  let db: Database;
  let registry: TenantRegistry;

  beforeEach(async () => {
    db = createInMemoryDatabase();
    registry = new TenantRegistry(db, kms());
    await migrateShared(db);
  });

  afterEach(async () => {
    await db.close();
  });

  async function tenant(slug: string): Promise<TenantDescriptor> {
    return registry.createTenant({ slug, name: slug });
  }

  function reposFor(
    t: TenantDescriptor,
    role: "cae" | "audit_staff" | "board",
  ) {
    return createTenantRepositories(db, sessionFor(contextOf(t), role));
  }

  function move(repos: ReturnType<typeof reposFor>, to: ItemStatus) {
    return repos.itemStatus.transition({
      assessmentId: ASSESSMENT,
      questionId: QUESTION,
      to,
    });
  }

  it("performs a legal transition, persisting the new status (no row = not_assessed)", async () => {
    const acme = await tenant("acme-co");
    const repos = reposFor(acme, "cae");

    // An item with no record yet reads as not assessed.
    expect(await repos.itemStatus.getStatus(ASSESSMENT, QUESTION)).toBeNull();

    const record = await repos.itemStatus.transition({
      assessmentId: ASSESSMENT,
      questionId: QUESTION,
      to: "evidence_requested",
    });
    expect(record.status).toBe("evidence_requested");
    expect(record.updatedBy).toBe("user-acme-co-cae");

    const stored = await repos.itemStatus.getStatus(ASSESSMENT, QUESTION);
    expect(stored?.status).toBe("evidence_requested");
  });

  it("allows Audit Staff to transition items", async () => {
    const acme = await tenant("acme-co");
    const repos = reposFor(acme, "audit_staff");
    await expect(move(repos, "evidence_requested")).resolves.toBeDefined();
  });

  it("rejects an illegal transition AT THE DATA LAYER and does not persist it", async () => {
    const acme = await tenant("acme-co");
    const repos = reposFor(acme, "cae");

    // not_assessed → closed_ready is not a legal edge.
    await expect(
      repos.itemStatus.transition({
        assessmentId: ASSESSMENT,
        questionId: QUESTION,
        to: "closed_ready",
      }),
    ).rejects.toBeInstanceOf(IllegalStatusTransitionError);

    // Nothing was written, and no audit entry was produced.
    expect(await repos.itemStatus.getStatus(ASSESSMENT, QUESTION)).toBeNull();
    const statusEntries = (await repos.audit.list()).filter(
      (e) => e.entity === "assessment_item_status",
    );
    expect(statusEntries).toHaveLength(0);
  });

  it("rejects an illegal transition from a mid-workflow status, leaving status unchanged", async () => {
    const acme = await tenant("acme-co");
    const repos = reposFor(acme, "cae");

    await move(repos, "evidence_requested");
    await move(repos, "evidence_submitted");
    await move(repos, "under_human_review");

    // Skipping remediation: review → closed_ready is illegal.
    await expect(move(repos, "closed_ready")).rejects.toBeInstanceOf(
      IllegalStatusTransitionError,
    );
    expect(
      (await repos.itemStatus.getStatus(ASSESSMENT, QUESTION))?.status,
    ).toBe("under_human_review");
  });

  it("a dismissed AI finding lands in reviewed_no_gap and cannot collapse into closed_ready", async () => {
    const acme = await tenant("acme-co");
    const repos = reposFor(acme, "cae");

    await move(repos, "evidence_requested");
    await move(repos, "evidence_submitted");
    await move(repos, "ai_flagged");
    await move(repos, "under_human_review");

    // The forbidden shortcut is rejected at the data layer.
    await expect(move(repos, "closed_ready")).rejects.toBeInstanceOf(
      IllegalStatusTransitionError,
    );

    // The dismissal must land in reviewed_no_gap first, then close from there.
    await move(repos, "reviewed_no_gap");
    expect(
      (await repos.itemStatus.getStatus(ASSESSMENT, QUESTION))?.status,
    ).toBe("reviewed_no_gap");
    await move(repos, "closed_ready");
    expect(
      (await repos.itemStatus.getStatus(ASSESSMENT, QUESTION))?.status,
    ).toBe("closed_ready");
  });

  it("forbids a read-only Board/Audit Committee user from transitioning anything", async () => {
    const acme = await tenant("acme-co");
    // Seed a status as CAE first.
    await move(reposFor(acme, "cae"), "evidence_requested");

    const board = reposFor(acme, "board");
    await expect(
      board.itemStatus.transition({
        assessmentId: ASSESSMENT,
        questionId: QUESTION,
        to: "evidence_submitted",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    // …but a Board user can still read the status.
    expect(
      (await board.itemStatus.getStatus(ASSESSMENT, QUESTION))?.status,
    ).toBe("evidence_requested");
  });

  it("records every transition as a status_change audit entry, so the full history is reconstructable", async () => {
    const acme = await tenant("acme-co");
    const repos = reposFor(acme, "cae");

    const path: ItemStatus[] = [
      "evidence_requested",
      "evidence_submitted",
      "ai_flagged",
      "under_human_review",
      "gap_confirmed",
      "remediation_in_progress",
      "ready_for_retest",
      "closed_ready",
    ];
    for (const to of path) {
      await move(repos, to);
    }

    const entries = (await repos.audit.list())
      .filter(
        (e) => e.entity === "assessment_item_status" && e.entityId === KEY,
      )
      .sort((a, b) => a.seq - b.seq);

    // One audit entry per transition, all of action status_change by the CAE.
    expect(entries).toHaveLength(path.length);
    expect(entries.every((e) => e.action === "status_change")).toBe(true);
    expect(entries.every((e) => e.actorRole === "cae")).toBe(true);

    // The new-value chain reproduces the exact path taken…
    const newStatuses = entries.map(
      (e) => JSON.parse(e.newValue ?? "null") as ItemStatus,
    );
    expect(newStatuses).toEqual(path);

    // …and the old-value chain shows where each move came from, starting at the
    // initial not_assessed state — i.e. the entire status history is recoverable.
    const oldStatuses = entries.map(
      (e) => JSON.parse(e.oldValue ?? "null") as ItemStatus,
    );
    expect(oldStatuses).toEqual(["not_assessed", ...path.slice(0, -1)]);

    // The hash chain over the whole tenant log still verifies.
    expect((await repos.audit.verify()).valid).toBe(true);
  });

  it("isolates item status per tenant", async () => {
    const acme = await tenant("acme-co");
    const beta = await tenant("beta-co");

    await move(reposFor(acme, "cae"), "evidence_requested");

    expect(
      (await reposFor(acme, "cae").itemStatus.getStatus(ASSESSMENT, QUESTION))
        ?.status,
    ).toBe("evidence_requested");
    // The same key in another tenant is untouched.
    expect(
      await reposFor(beta, "cae").itemStatus.getStatus(ASSESSMENT, QUESTION),
    ).toBeNull();
    expect(
      await reposFor(beta, "cae").itemStatus.getForAssessment(ASSESSMENT),
    ).toEqual([]);
  });
});
