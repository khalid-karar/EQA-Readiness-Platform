import { randomBytes } from "node:crypto";
import { ForbiddenError } from "@eqa/auth";
import { loadBundledCatalog, type ReviewChecklistPin } from "@eqa/content";
import { LocalKms } from "@eqa/crypto";
import type { TenantDescriptor } from "@eqa/tenant";
import {
  WorkingPaperReviewEngine,
  EngagementNotFoundError,
} from "@eqa/workflows";
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

const PACK_ID = "eqa-foundations";
const PACK_VERSION = "1.0.0";
const STANDARD = "1.1";

describe("WorkingPaperReviewEngine composed end-to-end (Step 12)", () => {
  let db: Database;
  let registry: TenantRegistry;
  let catalog: ReturnType<typeof loadBundledCatalog>;
  let pin: ReviewChecklistPin;

  beforeEach(async () => {
    db = createInMemoryDatabase();
    registry = new TenantRegistry(db, kms());
    await migrateShared(db);
    catalog = loadBundledCatalog();
    const pack = catalog.get(PACK_ID, PACK_VERSION);
    pin = {
      contentPackId: pack.meta.contentPackId,
      version: pack.meta.version,
      contentHash: pack.contentHash,
    };
  });

  afterEach(async () => {
    await db.close();
  });

  async function tenant(slug: string): Promise<TenantDescriptor> {
    return registry.createTenant({ slug, name: slug });
  }

  function engineFor(
    t: TenantDescriptor,
    role: "cae" | "audit_staff" | "board" = "cae",
  ) {
    const repos = createTenantRepositories(db, sessionFor(contextOf(t), role));
    return new WorkingPaperReviewEngine(repos.workingPaperReview, catalog);
  }

  function reposFor(
    t: TenantDescriptor,
    role: "cae" | "audit_staff" | "board" = "cae",
  ) {
    return createTenantRepositories(db, sessionFor(contextOf(t), role));
  }

  /** Seeds engagement → file → paper → checklist (Step 11.5 hierarchy). */
  async function seedEngagement(t: TenantDescriptor) {
    const repos = reposFor(t);
    const engagement = await repos.workingPaperReview.createEngagement({
      title: "Synthetic FY2025 Internal Audit",
      periodStart: "2025-01-01",
      periodEnd: "2025-12-31",
      status: "completed",
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
      pin,
    });
    return { engagement, checklist };
  }

  it("a reviewer can select a sample of completed engagements", async () => {
    const acme = await tenant("acme-co");
    const { engagement } = await seedEngagement(acme);
    const engine = engineFor(acme);

    const selection = await engine.selectSample(
      engagement.engagementId,
      "Annual QAIP sample — random selection",
    );

    expect(selection.engagementId).toBe(engagement.engagementId);
    expect(await engine.listSamples()).toHaveLength(1);
    expect(await engine.listReviewableEngagements()).toHaveLength(1);
  });

  it("records per-item conformance with notes against the pinned checklist", async () => {
    const acme = await tenant("acme-co");
    const { checklist } = await seedEngagement(acme);
    const engine = engineFor(acme);

    const view = await engine.getChecklistReview(checklist.checklistId);
    const item = view.items[0];
    expect(item?.text.en).toBeTruthy();
    expect(view.pin.contentHash).toBe(pin.contentHash);

    const recorded = await engine.recordConformance({
      checklistId: checklist.checklistId,
      checklistItemId: item?.itemId ?? "",
      conformance: "does_not_conform",
      note: "Working paper lacks signed acknowledgement for one team member.",
    });

    expect(recorded.note).toContain("signed acknowledgement");
    const updated = await engine.getChecklistReview(checklist.checklistId);
    expect(updated.items[0]?.result?.conformance).toBe("does_not_conform");
  });

  it("aggregate conformance reads back correctly per engagement and standard", async () => {
    const acme = await tenant("acme-co");
    const { engagement, checklist } = await seedEngagement(acme);
    const engine = engineFor(acme);

    const view = await engine.getChecklistReview(checklist.checklistId);
    for (const [idx, item] of view.items.entries()) {
      await engine.recordConformance({
        checklistId: checklist.checklistId,
        checklistItemId: item.itemId,
        conformance: idx === 0 ? "conforms" : "does_not_conform",
      });
    }

    const summary = await engine.getEngagementConformance(
      engagement.engagementId,
    );
    expect(summary.totalItems).toBe(view.items.length);
    expect(summary.conforms).toBe(1);
    expect(summary.doesNotConform).toBe(view.items.length - 1);
    expect(summary.byStandard).toHaveLength(1);
    expect(summary.byStandard[0]?.pin.contentHash).toBe(pin.contentHash);

    const standard = await engine.getStandardConformance(
      engagement.engagementId,
      STANDARD,
    );
    expect(standard?.doesNotConform).toBe(view.items.length - 1);
  });

  it("forbids a Board user from recording conformance results", async () => {
    const acme = await tenant("acme-co");
    const { engagement, checklist } = await seedEngagement(acme);
    const cae = engineFor(acme);
    const view = await cae.getChecklistReview(checklist.checklistId);
    const board = engineFor(acme, "board");

    await expect(
      board.recordConformance({
        checklistId: checklist.checklistId,
        checklistItemId: view.items[0]?.itemId ?? "",
        conformance: "conforms",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    await expect(
      board.selectSample(engagement.engagementId, "Board attempt"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("isolates results per tenant and audits mutations", async () => {
    const acme = await tenant("acme-co");
    const beta = await tenant("beta-co");
    const { engagement, checklist } = await seedEngagement(acme);
    const engine = engineFor(acme);
    const view = await engine.getChecklistReview(checklist.checklistId);

    await engine.selectSample(engagement.engagementId, "Synthetic sample");
    await engine.recordConformance({
      checklistId: checklist.checklistId,
      checklistItemId: view.items[0]?.itemId ?? "",
      conformance: "conforms",
      note: "Synthetic note",
    });

    expect(await engineFor(beta).listSamples()).toEqual([]);
    await expect(
      engineFor(beta).getEngagementConformance(engagement.engagementId),
    ).rejects.toBeInstanceOf(EngagementNotFoundError);

    const entries = await reposFor(acme).audit.list();
    expect(entries.some((e) => e.entity === "sample_selection")).toBe(true);
    expect(entries.some((e) => e.entity === "checklist_result")).toBe(true);
    expect((await reposFor(acme).audit.verify()).valid).toBe(true);
  });
});
