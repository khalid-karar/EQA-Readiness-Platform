/**
 * Audit chain hardening (Phase 5, item #3 — additive half).
 *
 * Asserts security-critical audit guarantees directly:
 *  1. Every synchronously-audited repository mutation appends audit rows.
 *  2. Out-of-band tampering (modify / remove / reorder) fails chain verify.
 *
 * Job-enqueue-only surfaces (`mockEqa.requestSimulation`, `evidencePack.requestExport`)
 * defer audit to job completion via {@link JobAuditPort} — not covered here.
 */
import { randomBytes } from "node:crypto";
import { AiReviewService, LocalStubModelAdapter } from "@eqa/ai";
import {
  loadBundledCatalog,
  resolveChecklistItems,
  type ContentPin,
} from "@eqa/content";
import { LocalKms, TenantCipher } from "@eqa/crypto";
import { InMemoryJobQueue } from "@eqa/jobs";
import type { TenantDescriptor } from "@eqa/tenant";
import {
  AI_GAP_FLAG_JOB,
  createGapFlaggingHandler,
  GapFlaggingEngine,
  type GapFlaggingPayload,
  type ItemStatus,
} from "@eqa/workflows";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clientFor, type Database } from "./database";
import { createTenantJobAuditPort } from "./evidence-system";
import { createGapFlagSink } from "./gap-flag-system";
import { migrateShared } from "./migrate";
import { TenantRegistry } from "./registry";
import {
  createTenantRepositories,
  type TenantRepositories,
} from "./repositories";
import { contextOf, sessionFor } from "./testing/fixtures";
import { createInMemoryDatabase } from "./testing/in-memory";

const PACK_ID = "eqa-foundations";
const PACK_VERSION = "1.0.0";
const ASSESSMENT = "assessment-chain";
const QUESTION = "Q-1-1-1";
const REMEDIATION_QUESTION = "Q-1-2-1";
const STANDARD = "1.1";
const REMEDIATION_STANDARD = "1.2";

function kms(): LocalKms {
  return new LocalKms(randomBytes(32), "test-master");
}

async function assertAuditGrowth(
  repos: TenantRepositories,
  label: string,
  mutate: () => Promise<void>,
): Promise<void> {
  const before = (await repos.audit.list()).length;
  await mutate();
  const after = (await repos.audit.list()).length;
  expect(
    after,
    `${label} should append at least one audit entry`,
  ).toBeGreaterThan(before);
}

async function seedKvChain(repos: TenantRepositories): Promise<void> {
  await repos.kv.set("chain-a", "1");
  await repos.kv.set("chain-b", "2");
  await repos.kv.set("chain-c", "3");
  expect((await repos.audit.verify()).valid).toBe(true);
}

describe("Audit chain hardening (Phase 5)", () => {
  let db: Database;
  let registry: TenantRegistry;
  let sharedKms: LocalKms;
  let queue: InMemoryJobQueue;
  let catalog: ReturnType<typeof loadBundledCatalog>;
  let pin: ContentPin;
  let checklistItemId: string;

  beforeEach(async () => {
    db = createInMemoryDatabase();
    sharedKms = kms();
    registry = new TenantRegistry(db, sharedKms);
    await migrateShared(db);
    catalog = loadBundledCatalog();
    pin = catalog.pinForAssessment(ASSESSMENT, PACK_ID, PACK_VERSION);
    const pack = catalog.get(PACK_ID, PACK_VERSION);
    checklistItemId =
      resolveChecklistItems(
        catalog,
        {
          contentPackId: pack.meta.contentPackId,
          version: pack.meta.version,
          contentHash: pack.contentHash,
        },
        STANDARD,
      )[0]?.id ?? "";

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

  async function tenant(slug: string): Promise<TenantDescriptor> {
    return registry.createTenant({ slug, name: slug });
  }

  function reposFor(
    t: TenantDescriptor,
    role: "cae" | "audit_staff" = "cae",
  ): TenantRepositories {
    return createTenantRepositories(db, sessionFor(contextOf(t), role));
  }

  async function reposWithCipher(
    t: TenantDescriptor,
  ): Promise<TenantRepositories> {
    const cipher = new TenantCipher(
      sharedKms,
      await registry.getEncryptedDataKey(t.slug),
    );
    return createTenantRepositories(db, sessionFor(contextOf(t), "cae"), {
      cipher,
    });
  }

  async function transitionTo(
    repos: TenantRepositories,
    questionId: string,
    target: ItemStatus,
  ): Promise<void> {
    const paths: Partial<Record<ItemStatus, ItemStatus[]>> = {
      evidence_requested: ["evidence_requested"],
      evidence_submitted: ["evidence_requested", "evidence_submitted"],
      ai_flagged: ["evidence_requested", "evidence_submitted", "ai_flagged"],
      gap_confirmed: [
        "evidence_requested",
        "evidence_submitted",
        "ai_flagged",
        "under_human_review",
        "gap_confirmed",
      ],
      remediation_in_progress: [
        "evidence_requested",
        "evidence_submitted",
        "ai_flagged",
        "under_human_review",
        "gap_confirmed",
        "remediation_in_progress",
      ],
      ready_for_retest: [
        "evidence_requested",
        "evidence_submitted",
        "ai_flagged",
        "under_human_review",
        "gap_confirmed",
        "remediation_in_progress",
        "ready_for_retest",
      ],
    };
    const path = paths[target];
    if (!path) {
      throw new Error(`no seeded path to ${target}`);
    }
    for (const to of path) {
      await repos.itemStatus.transition({
        assessmentId: ASSESSMENT,
        questionId,
        to,
      });
    }
  }

  async function aiFlaggedFindingId(t: TenantDescriptor): Promise<string> {
    const repos = reposFor(t);
    await transitionTo(repos, QUESTION, "evidence_submitted");
    const payload: GapFlaggingPayload = {
      questionId: QUESTION,
      standardNumber: STANDARD,
      pin,
      evidence: {
        excerpts: ["Synthetic evidence excerpt for audit-chain test."],
        identities: [],
      },
    };
    await queue.enqueue({
      name: AI_GAP_FLAG_JOB,
      tenant: contextOf(t),
      payload,
    });
    await queue.onIdle();
    const drafts = await repos.draftFindings.getForAssessment(ASSESSMENT);
    const findingId = drafts[0]?.findingId;
    if (!findingId) throw new Error("expected a persisted draft finding");
    return findingId;
  }

  it("every mutating repository method emits an audit-log entry", async () => {
    const acme = await tenant("audit-chain-co");
    const repos = await reposWithCipher(acme);
    const findingId = await aiFlaggedFindingId(acme);

    await assertAuditGrowth(repos, "kv.set", () =>
      repos.kv.set("audit-key", "v1"),
    );
    await assertAuditGrowth(repos, "settings.set", () =>
      repos.settings.set("flag", "on"),
    );
    await assertAuditGrowth(repos, "secure.set", () =>
      repos.secure!.set("ssn", "000-00-0000"),
    );
    await assertAuditGrowth(repos, "responses.submit", () =>
      repos.responses.submit({
        assessmentId: ASSESSMENT,
        questionId: QUESTION,
        answer: "4",
        pin,
      }),
    );
    await assertAuditGrowth(repos, "itemStatus.transition", async () => {
      await repos.itemStatus.transition({
        assessmentId: ASSESSMENT,
        questionId: "Q-1-1-2",
        to: "evidence_requested",
      });
    });

    const evidenceId = "ev-chain-1";
    await assertAuditGrowth(repos, "evidence.create", () =>
      repos.evidence.create({
        evidenceId,
        version: 1,
        versionHash: "vh1",
        contentHash: "ch1",
        fileName: "evidence.pdf",
        contentType: "application/pdf",
        sizeBytes: 128,
        links: [STANDARD],
        objectKey: `${acme.slug}/${evidenceId}/v1`,
      }),
    );
    await assertAuditGrowth(repos, "evidence.recordDownloadGrant", () =>
      repos.evidence.recordDownloadGrant({
        evidenceId,
        version: 1,
        objectKey: `${acme.slug}/${evidenceId}/v1`,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }),
    );

    let engagementId = "";
    let fileId = "";
    let paperId = "";
    let checklistId = "";

    await assertAuditGrowth(
      repos,
      "workingPaperReview.createEngagement",
      async () => {
        const engagement = await repos.workingPaperReview.createEngagement({
          title: "Audit chain engagement",
          periodStart: "2025-01-01",
          periodEnd: "2025-12-31",
        });
        engagementId = engagement.engagementId;
      },
    );
    await assertAuditGrowth(
      repos,
      "workingPaperReview.createFile",
      async () => {
        const file = await repos.workingPaperReview.createFile({
          engagementId,
          name: "Working papers",
        });
        fileId = file.fileId;
      },
    );
    await assertAuditGrowth(
      repos,
      "workingPaperReview.createWorkingPaper",
      async () => {
        const paper = await repos.workingPaperReview.createWorkingPaper({
          fileId,
          reference: "WP-1.1",
          title: "Ethics",
        });
        paperId = paper.workingPaperId;
      },
    );
    await assertAuditGrowth(
      repos,
      "workingPaperReview.createChecklist",
      async () => {
        const checklist = await repos.workingPaperReview.createChecklist({
          workingPaperId: paperId,
          standardNumber: STANDARD,
          pin: {
            contentPackId: PACK_ID,
            version: PACK_VERSION,
            contentHash: catalog.get(PACK_ID, PACK_VERSION).contentHash,
          },
        });
        checklistId = checklist.checklistId;
      },
    );
    await assertAuditGrowth(
      repos,
      "workingPaperReview.recordChecklistResult",
      async () => {
        await repos.workingPaperReview.recordChecklistResult({
          checklistId,
          checklistItemId,
          conformance: "conforms",
          note: "Synthetic checklist result",
        });
      },
    );
    await assertAuditGrowth(
      repos,
      "workingPaperReview.createSampleSelection",
      async () => {
        await repos.workingPaperReview.createSampleSelection({
          engagementId,
          rationale: "Synthetic sample",
        });
      },
    );

    await assertAuditGrowth(repos, "humanReview.applyReview", async () => {
      await repos.humanReview.applyReview({ findingId, action: "accept" });
    });

    await transitionTo(repos, REMEDIATION_QUESTION, "gap_confirmed");
    let remediationId = "";
    await assertAuditGrowth(repos, "remediation.assign", async () => {
      const remediation = await repos.remediation.assign({
        assessmentId: ASSESSMENT,
        questionId: REMEDIATION_QUESTION,
        standardNumber: REMEDIATION_STANDARD,
        action: "Fix process",
        owner: "Owner",
        targetDate: "2026-12-31",
      });
      remediationId = remediation.remediationId;
    });
    await assertAuditGrowth(repos, "remediation.updatePlan", async () => {
      await repos.remediation.updatePlan({
        remediationId,
        action: "Updated action",
        owner: "New owner",
        targetDate: "2027-01-31",
      });
    });
    await assertAuditGrowth(
      repos,
      "remediation.markReadyForRetest",
      async () => {
        await repos.remediation.markReadyForRetest(remediationId);
      },
    );
    await assertAuditGrowth(repos, "remediation.recordRetestFail", async () => {
      await repos.remediation.recordRetestFail(remediationId, "Incomplete");
    });

    await repos.itemStatus.transition({
      assessmentId: ASSESSMENT,
      questionId: REMEDIATION_QUESTION,
      to: "gap_confirmed",
    });
    await repos.itemStatus.transition({
      assessmentId: ASSESSMENT,
      questionId: REMEDIATION_QUESTION,
      to: "remediation_in_progress",
    });
    await repos.remediation.markReadyForRetest(remediationId);
    await assertAuditGrowth(repos, "remediation.recordRetestPass", async () => {
      await repos.remediation.recordRetestPass(remediationId);
    });

    expect((await repos.audit.verify()).valid).toBe(true);
  });

  it("detects tampering — modified, removed, and reordered rows fail verify()", async () => {
    const modifyTenant = await tenant("tamper-modify");
    const modifyRepos = reposFor(modifyTenant);
    await seedKvChain(modifyRepos);
    await clientFor(db).query(
      `UPDATE "${modifyTenant.schemaName}".audit_log SET new_value = $1 WHERE seq = 2`,
      [JSON.stringify("TAMPERED")],
    );
    const modified = await modifyRepos.audit.verify();
    expect(modified.valid).toBe(false);
    if (!modified.valid) {
      expect(modified.reason).toMatch(/modified|mismatch/i);
    }

    const removeTenant = await tenant("tamper-remove");
    const removeRepos = reposFor(removeTenant);
    await seedKvChain(removeRepos);
    await clientFor(db).query(
      `DELETE FROM "${removeTenant.schemaName}".audit_log WHERE seq = 2`,
    );
    const removed = await removeRepos.audit.verify();
    expect(removed.valid).toBe(false);
    if (!removed.valid) {
      expect(removed.reason).toMatch(/removed|reordered|sequence break/i);
    }

    const reorderTenant = await tenant("tamper-reorder");
    const reorderRepos = reposFor(reorderTenant);
    await seedKvChain(reorderRepos);
    const [first, second] = await reorderRepos.audit.list();
    if (!first || !second) throw new Error("expected two audit rows to swap");
    const schema = reorderTenant.schemaName;
    const swapRow = async (seq: number, entry: typeof first): Promise<void> => {
      await clientFor(db).query(
        `UPDATE "${schema}".audit_log
            SET occurred_at = $1, actor_user_id = $2, actor_role = $3,
                action = $4, entity = $5, entity_id = $6,
                old_value = $7, new_value = $8, prev_hash = $9, entry_hash = $10
          WHERE seq = $11`,
        [
          entry.occurredAt,
          entry.actorUserId,
          entry.actorRole,
          entry.action,
          entry.entity,
          entry.entityId,
          entry.oldValue,
          entry.newValue,
          entry.prevHash,
          entry.entryHash,
          seq,
        ],
      );
    };
    await swapRow(1, second);
    await swapRow(2, first);
    const reordered = await reorderRepos.audit.verify();
    expect(reordered.valid).toBe(false);
    if (!reordered.valid) {
      expect(reordered.reason).toMatch(
        /previous-hash|modified|mismatch|removed|reordered/i,
      );
    }
  });
});
