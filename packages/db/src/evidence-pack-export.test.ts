import { randomBytes } from "node:crypto";
import { ForbiddenError } from "@eqa/auth";
import { loadBundledCatalog } from "@eqa/content";
import { LocalKms } from "@eqa/crypto";
import { InMemoryJobQueue } from "@eqa/jobs";
import {
  createEvidencePackHandler,
  defaultEvidencePackRenderer,
  EVIDENCE_PACK_EXPORT_JOB,
  EVIDENCE_PACK_KIND,
  verifyPdfPackCompliance,
  type ItemStatus,
} from "@eqa/workflows";
import { InMemoryObjectStore, type NewEvidenceVersion } from "@eqa/storage";
import type { TenantDescriptor } from "@eqa/tenant";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Database } from "./database";
import {
  createEvidencePackLoader,
  createEvidencePackSink,
} from "./evidence-pack-system";
import { createTenantJobAuditPort } from "./evidence-system";
import { migrateShared } from "./migrate";
import { TenantRegistry } from "./registry";
import { createTenantRepositories } from "./repositories";
import { contextOf, sessionFor } from "./testing/fixtures";
import { createInMemoryDatabase } from "./testing/in-memory";

const PACK_ID = "eqa-foundations";
const PACK_VERSION = "1.0.0";
const ASSESSMENT = "assessment-1";

const STATUS_SEED: ReadonlyArray<[string, ItemStatus]> = [
  ["Q-1-1-1", "closed_ready"],
  ["Q-1-2-1", "gap_confirmed"],
];

async function seedStatuses(
  repos: ReturnType<typeof createTenantRepositories>,
): Promise<void> {
  for (const [questionId, target] of STATUS_SEED) {
    const path: ItemStatus[] =
      target === "closed_ready"
        ? [
            "evidence_requested",
            "evidence_submitted",
            "ai_flagged",
            "under_human_review",
            "reviewed_no_gap",
            "closed_ready",
          ]
        : [
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
}

async function seedEvidenceMetadata(
  repos: ReturnType<typeof createTenantRepositories>,
): Promise<void> {
  const version: NewEvidenceVersion = {
    evidenceId: "ev-1",
    version: 1,
    versionHash: "vh1",
    contentHash: "ch1",
    fileName: "ethics-policy.pdf",
    contentType: "application/pdf",
    sizeBytes: 1024,
    links: ["1.1", "Q-1-1-1"],
    objectKey: "unused-in-pack",
  };
  await repos.evidence.create(version);
}

describe("EQA evidence pack export composed end-to-end", () => {
  let db: Database;
  let registry: TenantRegistry;
  let queue: InMemoryJobQueue;
  let objectStore: InMemoryObjectStore;
  const catalog = loadBundledCatalog();
  const RAW_EVIDENCE_BYTES = Buffer.from("%PDF-1.7 synthetic evidence");

  beforeEach(async () => {
    db = createInMemoryDatabase();
    registry = new TenantRegistry(db, new LocalKms(randomBytes(32), "test"));
    await migrateShared(db);
    objectStore = new InMemoryObjectStore("exports-ksa");
    queue = new InMemoryJobQueue(
      {
        [EVIDENCE_PACK_EXPORT_JOB]: createEvidencePackHandler({
          loader: createEvidencePackLoader(db, catalog),
          renderer: defaultEvidencePackRenderer,
          sink: createEvidencePackSink(db, objectStore),
        }),
      },
      { auditPort: createTenantJobAuditPort(db) },
    );
    await objectStore.put("raw/evidence/ev-1.pdf", RAW_EVIDENCE_BYTES);
  });

  afterEach(async () => {
    await db.close();
  });

  function tenant(slug: string): Promise<TenantDescriptor> {
    return registry.createTenant({ slug, name: slug });
  }

  function reposFor(t: TenantDescriptor, role: "cae" | "board" = "cae") {
    return createTenantRepositories(db, sessionFor(contextOf(t), role), {
      jobQueue: queue,
      objectStore,
    });
  }

  it("runs as an audited tenant-scoped job and persists a readiness_evidence_pack", async () => {
    const acme = await tenant("acme-co");
    const repos = reposFor(acme, "cae");
    await seedStatuses(repos);
    await seedEvidenceMetadata(repos);

    const { jobId } = await repos.evidencePack.requestExport({
      assessmentId: ASSESSMENT,
      contentPackId: PACK_ID,
      contentVersion: PACK_VERSION,
      locale: "en",
    });
    await queue.onIdle();

    const latest = await repos.evidencePack.getLatest(ASSESSMENT);
    expect(latest).not.toBeNull();
    expect(latest?.manifest.kind).toBe(EVIDENCE_PACK_KIND);
    expect(latest?.manifest.bundledFileCount).toBe(0);
    expect(latest?.manifest.includeRawEvidence).toBe(false);
    expect(latest?.manifest.standards.length).toBeGreaterThan(0);

    const pdf = await repos.evidencePack.readPdfBytes(latest!.objectKey);
    expect(pdf).not.toBeNull();
    expect(await verifyPdfPackCompliance(pdf!)).toBe(true);
    expect(Buffer.from(pdf!).toString("latin1")).not.toContain(
      "%PDF-1.7 synthetic evidence",
    );

    const audit = await repos.audit.list();
    expect(
      audit.some(
        (e) =>
          e.entity === `job:${EVIDENCE_PACK_EXPORT_JOB}` &&
          e.entityId === jobId,
      ),
    ).toBe(true);
    expect(
      audit.some(
        (e) => e.entity === "evidence_pack_export" && e.action === "create",
      ),
    ).toBe(true);
  });

  it("assembles evidence index references without bundling raw files", async () => {
    const acme = await tenant("acme-co");
    const repos = reposFor(acme, "cae");
    await seedStatuses(repos);
    await seedEvidenceMetadata(repos);

    await repos.evidencePack.requestExport({
      assessmentId: ASSESSMENT,
      contentPackId: PACK_ID,
      contentVersion: PACK_VERSION,
    });
    await queue.onIdle();

    const latest = await repos.evidencePack.getLatest(ASSESSMENT);
    const std11 = latest?.manifest.standards.find(
      (s) => s.standardNumber === "1.1",
    );
    expect(std11?.evidenceIndex).toHaveLength(1);
    expect(std11?.evidenceIndex[0]?.fileName).toBe("ethics-policy.pdf");
    expect(latest?.manifest.rawEvidenceExcluded).toBe(true);
  });

  it("forbids Board from requesting pack generation", async () => {
    const acme = await tenant("acme-co");
    const boardRepos = reposFor(acme, "board");

    await expect(
      boardRepos.evidencePack.requestExport({
        assessmentId: ASSESSMENT,
        contentPackId: PACK_ID,
        contentVersion: PACK_VERSION,
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    const caeRepos = reposFor(acme, "cae");
    await seedStatuses(caeRepos);
    await caeRepos.evidencePack.requestExport({
      assessmentId: ASSESSMENT,
      contentPackId: PACK_ID,
      contentVersion: PACK_VERSION,
    });
    await queue.onIdle();

    const boardRead = await boardRepos.evidencePack.getLatest(ASSESSMENT);
    expect(boardRead?.manifest.kind).toBe(EVIDENCE_PACK_KIND);
  });
});
