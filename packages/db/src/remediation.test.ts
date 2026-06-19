import { randomBytes } from "node:crypto";
import { ForbiddenError } from "@eqa/auth";
import { LocalKms } from "@eqa/crypto";
import type { TenantDescriptor } from "@eqa/tenant";
import {
  IllegalRemediationStateError,
  IllegalStatusTransitionError,
  isRemediationOverdue,
  type ItemStatus,
} from "@eqa/workflows";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Database } from "./database";
import { migrateShared } from "./migrate";
import { TenantRegistry } from "./registry";
import { createTenantRepositories } from "./repositories";
import { contextOf, sessionFor } from "./testing/fixtures";
import { createInMemoryDatabase } from "./testing/in-memory";

const ASSESSMENT = "assessment-1";
const QUESTION = "Q-1-2-1";
const STANDARD = "1.2";
const KEY = `${ASSESSMENT}::${QUESTION}`;

function kms(): LocalKms {
  return new LocalKms(randomBytes(32), "test-master");
}

async function seedGapConfirmed(
  repos: ReturnType<typeof createTenantRepositories>,
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
      questionId: QUESTION,
      to,
    });
  }
}

describe("Remediation tracker composed end-to-end", () => {
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
    role: "cae" | "audit_staff" | "board" = "cae",
  ) {
    return createTenantRepositories(db, sessionFor(contextOf(t), role));
  }

  it("tracks remediation through the full lifecycle including failed retest loop", async () => {
    const acme = await tenant("acme-co");
    const repos = reposFor(acme, "cae");
    await seedGapConfirmed(repos);

    const item = await repos.remediation.assign({
      assessmentId: ASSESSMENT,
      questionId: QUESTION,
      standardNumber: STANDARD,
      action: "Update COI process",
      owner: "Audit Manager",
      targetDate: "2026-12-31",
    });
    expect(item.action).toBe("Update COI process");
    expect(
      (await repos.itemStatus.getStatus(ASSESSMENT, QUESTION))?.status,
    ).toBe("remediation_in_progress");

    await repos.remediation.markReadyForRetest(item.remediationId);
    expect(
      (await repos.itemStatus.getStatus(ASSESSMENT, QUESTION))?.status,
    ).toBe("ready_for_retest");

    await repos.remediation.recordRetestFail(
      item.remediationId,
      "Evidence incomplete",
    );
    expect(
      (await repos.itemStatus.getStatus(ASSESSMENT, QUESTION))?.status,
    ).toBe("under_human_review");

    await repos.itemStatus.transition({
      assessmentId: ASSESSMENT,
      questionId: QUESTION,
      to: "gap_confirmed",
    });
    await repos.itemStatus.transition({
      assessmentId: ASSESSMENT,
      questionId: QUESTION,
      to: "remediation_in_progress",
    });
    await repos.remediation.markReadyForRetest(item.remediationId);
    const closed = await repos.remediation.recordRetestPass(item.remediationId);
    expect(closed.closedAt).not.toBeNull();
    expect(
      (await repos.itemStatus.getStatus(ASSESSMENT, QUESTION))?.status,
    ).toBe("closed_ready");
  });

  it("flags overdue items when target date has passed", async () => {
    const acme = await tenant("acme-co");
    const repos = reposFor(acme, "cae");
    await seedGapConfirmed(repos);

    await repos.remediation.assign({
      assessmentId: ASSESSMENT,
      questionId: QUESTION,
      standardNumber: STANDARD,
      action: "Fix gap",
      owner: "Owner",
      targetDate: "2020-01-01",
    });

    const status = await repos.itemStatus.getStatus(ASSESSMENT, QUESTION);
    expect(
      isRemediationOverdue(
        "2020-01-01",
        status?.status ?? "not_assessed",
        "2026-06-19",
      ),
    ).toBe(true);
  });

  it("rejects illegal transitions at the data layer", async () => {
    const acme = await tenant("acme-co");
    const repos = reposFor(acme, "cae");

    await expect(
      repos.remediation.assign({
        assessmentId: ASSESSMENT,
        questionId: QUESTION,
        standardNumber: STANDARD,
        action: "Fix",
        owner: "Owner",
        targetDate: "2026-12-31",
      }),
    ).rejects.toBeInstanceOf(IllegalRemediationStateError);

    await seedGapConfirmed(repos);
    const item = await repos.remediation.assign({
      assessmentId: ASSESSMENT,
      questionId: QUESTION,
      standardNumber: STANDARD,
      action: "Fix",
      owner: "Owner",
      targetDate: "2026-12-31",
    });

    await expect(
      repos.remediation.recordRetestPass(item.remediationId),
    ).rejects.toBeInstanceOf(IllegalRemediationStateError);

    await expect(
      repos.itemStatus.transition({
        assessmentId: ASSESSMENT,
        questionId: QUESTION,
        to: "closed_ready",
      }),
    ).rejects.toBeInstanceOf(IllegalStatusTransitionError);
  });

  it("forbids Board from mutating remediation", async () => {
    const acme = await tenant("acme-co");
    const cae = reposFor(acme, "cae");
    await seedGapConfirmed(cae);
    const item = await cae.remediation.assign({
      assessmentId: ASSESSMENT,
      questionId: QUESTION,
      standardNumber: STANDARD,
      action: "Fix",
      owner: "Owner",
      targetDate: "2026-12-31",
    });

    const board = reposFor(acme, "board");
    await expect(
      board.remediation.markReadyForRetest(item.remediationId),
    ).rejects.toBeInstanceOf(ForbiddenError);

    expect(await board.remediation.getById(item.remediationId)).toEqual(item);
  });

  it("isolates remediation per tenant and audits mutations", async () => {
    const acme = await tenant("acme-co");
    const beta = await tenant("beta-co");
    const acmeRepos = reposFor(acme, "cae");
    await seedGapConfirmed(acmeRepos);
    await acmeRepos.remediation.assign({
      assessmentId: ASSESSMENT,
      questionId: QUESTION,
      standardNumber: STANDARD,
      action: "Fix",
      owner: "Owner",
      targetDate: "2026-12-31",
    });

    expect(
      await reposFor(beta, "cae").remediation.listForAssessment(ASSESSMENT),
    ).toEqual([]);

    const entries = (await acmeRepos.audit.list()).filter(
      (e) => e.entity === "remediation_item",
    );
    expect(entries.length).toBeGreaterThan(0);
    expect(
      (await acmeRepos.audit.list()).filter(
        (e) => e.entity === "assessment_item_status" && e.entityId === KEY,
      ).length,
    ).toBeGreaterThan(0);
    expect((await acmeRepos.audit.verify()).valid).toBe(true);
  });
});
