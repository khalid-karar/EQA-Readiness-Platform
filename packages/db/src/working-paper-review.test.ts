import { randomBytes } from "node:crypto";
import { ForbiddenError } from "@eqa/auth";
import {
  loadBundledCatalog,
  resolveChecklistItems,
  type ReviewChecklistPin,
} from "@eqa/content";
import { LocalKms } from "@eqa/crypto";
import type { TenantDescriptor } from "@eqa/tenant";
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

describe("TenantWorkingPaperReviewRepository (working-paper review data model)", () => {
  let db: Database;
  let registry: TenantRegistry;
  let pin: ReviewChecklistPin;
  let checklistItemId: string;

  beforeEach(async () => {
    db = createInMemoryDatabase();
    registry = new TenantRegistry(db, kms());
    await migrateShared(db);
    const catalog = loadBundledCatalog();
    const pack = catalog.get(PACK_ID, PACK_VERSION);
    pin = {
      contentPackId: pack.meta.contentPackId,
      version: pack.meta.version,
      contentHash: pack.contentHash,
    };
    checklistItemId =
      resolveChecklistItems(catalog, pin, STANDARD)[0]?.id ?? "";
  });

  afterEach(async () => {
    await db.close();
  });

  async function tenant(slug: string): Promise<TenantDescriptor> {
    return registry.createTenant({ slug, name: slug });
  }

  function reposFor(
    t: TenantDescriptor,
    role: "cae" | "audit_staff" | "board" = "cae",
  ) {
    return createTenantRepositories(db, sessionFor(contextOf(t), role));
  }

  /** Builds the full engagement → file → paper → checklist hierarchy. */
  async function seedHierarchy(t: TenantDescriptor) {
    const repos = reposFor(t);
    const engagement = await repos.workingPaperReview.createEngagement({
      title: "Synthetic FY2025 Internal Audit",
      periodStart: "2025-01-01",
      periodEnd: "2025-12-31",
    });
    const file = await repos.workingPaperReview.createFile({
      engagementId: engagement.engagementId,
      name: "Ethics Working Papers",
      description: "Synthetic audit file",
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
    return { engagement, file, paper, checklist };
  }

  it("creates and relates the full entity hierarchy", async () => {
    const acme = await tenant("acme-co");
    const { engagement, file, paper, checklist } = await seedHierarchy(acme);
    const repos = reposFor(acme);

    const selection = await repos.workingPaperReview.createSampleSelection({
      engagementId: engagement.engagementId,
      rationale: "Random sample for annual QAIP review",
    });
    const result = await repos.workingPaperReview.recordChecklistResult({
      checklistId: checklist.checklistId,
      checklistItemId,
      conformance: "conforms",
      note: "Methodology followed per checklist",
    });

    expect(
      (await repos.workingPaperReview.getEngagement(engagement.engagementId))
        ?.title,
    ).toBe("Synthetic FY2025 Internal Audit");
    expect(
      await repos.workingPaperReview.getFilesForEngagement(
        engagement.engagementId,
      ),
    ).toHaveLength(1);
    expect(
      (
        await repos.workingPaperReview.getFilesForEngagement(
          engagement.engagementId,
        )
      )[0]?.fileId,
    ).toBe(file.fileId);
    expect(
      await repos.workingPaperReview.getWorkingPapersForFile(file.fileId),
    ).toHaveLength(1);
    expect(
      (await repos.workingPaperReview.getWorkingPapersForFile(file.fileId))[0]
        ?.workingPaperId,
    ).toBe(paper.workingPaperId);
    expect(
      await repos.workingPaperReview.getChecklistsForWorkingPaper(
        paper.workingPaperId,
      ),
    ).toHaveLength(1);
    expect(
      (
        await repos.workingPaperReview.getChecklistsForWorkingPaper(
          paper.workingPaperId,
        )
      )[0]?.checklistId,
    ).toBe(checklist.checklistId);
    expect(
      await repos.workingPaperReview.getResultsForChecklist(
        checklist.checklistId,
      ),
    ).toHaveLength(1);
    expect(result.checklistItemId).toBe(checklistItemId);
    expect(
      await repos.workingPaperReview.getSelectionsForEngagement(
        engagement.engagementId,
      ),
    ).toHaveLength(1);
    expect(selection.engagementId).toBe(engagement.engagementId);
  });

  it("stores the content pin on checklists so results tie to the exact checklist version", async () => {
    const acme = await tenant("acme-co");
    const { checklist } = await seedHierarchy(acme);
    const catalog = loadBundledCatalog();

    expect(checklist.pin).toEqual(pin);
    const contentItems = resolveChecklistItems(
      catalog,
      checklist.pin,
      STANDARD,
    );
    expect(contentItems.map((i) => i.id)).toContain(checklistItemId);

    await reposFor(acme).workingPaperReview.recordChecklistResult({
      checklistId: checklist.checklistId,
      checklistItemId,
      conformance: "does_not_conform",
    });

    const stored = (
      await reposFor(acme).workingPaperReview.getChecklistsForWorkingPaper(
        checklist.workingPaperId,
      )
    )[0];
    expect(stored?.pin.contentHash).toBe(pin.contentHash);
    expect(stored?.pin.version).toBe(PACK_VERSION);
  });

  it("isolates working-paper review data per tenant", async () => {
    const acme = await tenant("acme-co");
    const beta = await tenant("beta-co");
    const { engagement } = await seedHierarchy(acme);

    expect(
      await reposFor(acme).workingPaperReview.listEngagements(),
    ).toHaveLength(1);
    expect(await reposFor(beta).workingPaperReview.listEngagements()).toEqual(
      [],
    );
    expect(
      await reposFor(beta).workingPaperReview.getEngagement(
        engagement.engagementId,
      ),
    ).toBeNull();
  });

  it("allows Audit Staff to mutate and forbids Board from mutating", async () => {
    const acme = await tenant("acme-co");
    const staff = reposFor(acme, "audit_staff");
    const board = reposFor(acme, "board");

    const engagement = await staff.workingPaperReview.createEngagement({
      title: "Staff-created engagement",
      periodStart: "2025-01-01",
      periodEnd: "2025-06-30",
    });
    expect(engagement.engagementId).toBeDefined();

    await expect(
      board.workingPaperReview.createEngagement({
        title: "Board attempt",
        periodStart: "2025-01-01",
        periodEnd: "2025-06-30",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    // Board can still read.
    expect(
      await board.workingPaperReview.getEngagement(engagement.engagementId),
    ).toBeDefined();
  });

  it("audits every mutation automatically", async () => {
    const acme = await tenant("acme-co");
    const repos = reposFor(acme);
    const { engagement, checklist } = await seedHierarchy(acme);

    await repos.workingPaperReview.createSampleSelection({
      engagementId: engagement.engagementId,
      rationale: "Synthetic sample",
    });
    await repos.workingPaperReview.recordChecklistResult({
      checklistId: checklist.checklistId,
      checklistItemId,
      conformance: "conforms",
    });

    const entries = await repos.audit.list();
    const entities = entries.map((e) => e.entity);

    expect(entities).toContain("audit_engagement");
    expect(entities).toContain("audit_file");
    expect(entities).toContain("working_paper");
    expect(entities).toContain("review_checklist");
    expect(entities).toContain("sample_selection");
    expect(entities).toContain("checklist_result");

    const checklistAudit = entries.find(
      (e) => e.entity === "review_checklist" && e.action === "create",
    );
    const recorded = JSON.parse(checklistAudit?.newValue ?? "null") as {
      pin: ReviewChecklistPin;
      standardNumber: string;
    };
    expect(recorded.pin.contentHash).toBe(pin.contentHash);
    expect(recorded.standardNumber).toBe(STANDARD);

    expect((await repos.audit.verify()).valid).toBe(true);
  });
});
