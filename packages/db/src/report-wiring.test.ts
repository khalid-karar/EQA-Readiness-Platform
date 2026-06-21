import { randomBytes } from "node:crypto";
import { LocalKms } from "@eqa/crypto";
import { InMemoryJobQueue } from "@eqa/jobs";
import {
  assertFormalAssessmentResult,
  EVIDENCE_PACK_EXPORT_JOB,
  EVIDENCE_PACK_KIND,
  MOCK_EQA_SIMULATION_JOB,
  READINESS_SIMULATION_KIND,
  verifyPdfPackCompliance,
  type ItemStatus,
} from "@eqa/workflows";
import { InMemoryObjectStore } from "@eqa/storage";
import type { TenantDescriptor } from "@eqa/tenant";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Database } from "./database";
import { createTenantJobAuditPort } from "./evidence-system";
import { migrateShared } from "./migrate";
import { TenantRegistry } from "./registry";
import { createReportJobHandlers } from "./report-wiring";
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

describe("report job wiring (mock-EQA + evidence pack)", () => {
  let db: Database;
  let registry: TenantRegistry;
  let queue: InMemoryJobQueue;
  let objectStore: InMemoryObjectStore;

  beforeEach(async () => {
    db = createInMemoryDatabase();
    registry = new TenantRegistry(db, new LocalKms(randomBytes(32), "test"));
    await migrateShared(db);
    objectStore = new InMemoryObjectStore("exports-ksa");
    queue = new InMemoryJobQueue(createReportJobHandlers(db, objectStore), {
      auditPort: createTenantJobAuditPort(db),
    });
  });

  afterEach(async () => {
    await db.close();
  });

  function tenant(slug: string): Promise<TenantDescriptor> {
    return registry.createTenant({ slug, name: slug });
  }

  function reposFor(t: TenantDescriptor) {
    return createTenantRepositories(db, sessionFor(contextOf(t), "cae"), {
      jobQueue: queue,
      objectStore,
    });
  }

  it("exposes both report job handlers", () => {
    const handlers = createReportJobHandlers(db, objectStore);
    expect(typeof handlers[MOCK_EQA_SIMULATION_JOB]).toBe("function");
    expect(typeof handlers[EVIDENCE_PACK_EXPORT_JOB]).toBe("function");
  });

  it("persists tenant-scoped mock-EQA simulations that cannot become formal results", async () => {
    const acme = await tenant("acme-co");
    const repos = reposFor(acme);
    await seedStatuses(repos);

    await repos.mockEqa.requestSimulation({
      assessmentId: ASSESSMENT,
      contentPackId: PACK_ID,
      contentVersion: PACK_VERSION,
    });
    await queue.onIdle();

    const latest = await repos.mockEqa.getLatest(ASSESSMENT);
    expect(latest?.kind).toBe(READINESS_SIMULATION_KIND);
    expect(() => assertFormalAssessmentResult(latest)).toThrow(
      /readiness simulation as a formal assessment/i,
    );

    const beta = await tenant("beta-co");
    const betaRepos = reposFor(beta);
    expect(await betaRepos.mockEqa.getLatest(ASSESSMENT)).toBeNull();
  });

  it("generates a clean evidence pack PDF without bundling raw bytes", async () => {
    const acme = await tenant("acme-co");
    const repos = reposFor(acme);
    await seedStatuses(repos);
    await objectStore.put(
      "raw/evidence/ev-1.pdf",
      Buffer.from("%PDF-1.7 synthetic evidence"),
    );

    await repos.evidencePack.requestExport({
      assessmentId: ASSESSMENT,
      contentPackId: PACK_ID,
      contentVersion: PACK_VERSION,
      locale: "en",
    });
    await queue.onIdle();

    const latest = await repos.evidencePack.getLatest(ASSESSMENT);
    expect(latest?.manifest.kind).toBe(EVIDENCE_PACK_KIND);
    expect(latest?.manifest.bundledFileCount).toBe(0);
    expect(latest?.manifest.rawEvidenceExcluded).toBe(true);

    const pdf = await repos.evidencePack.readPdfBytes(latest!.objectKey);
    expect(pdf).not.toBeNull();
    expect(await verifyPdfPackCompliance(pdf!)).toBe(true);
    expect(Buffer.from(pdf!).toString("latin1")).not.toContain(
      "%PDF-1.7 synthetic evidence",
    );
  });
});
