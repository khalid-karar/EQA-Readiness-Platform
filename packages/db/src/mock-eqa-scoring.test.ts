import { randomBytes } from "node:crypto";
import { ForbiddenError } from "@eqa/auth";
import { loadBundledCatalog } from "@eqa/content";
import { LocalKms } from "@eqa/crypto";
import { InMemoryJobQueue } from "@eqa/jobs";
import type { TenantDescriptor } from "@eqa/tenant";
import {
  assertFormalAssessmentResult,
  computeMockEqaSimulation,
  createMockEqaScoringHandler,
  MOCK_EQA_DISCLAIMER,
  MOCK_EQA_SIMULATION_JOB,
  READINESS_SIMULATION_KIND,
  renderQuestionnaire,
  type ItemStatus,
} from "@eqa/workflows";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Database } from "./database";
import { createTenantJobAuditPort } from "./evidence-system";
import {
  createMockEqaScoringLoader,
  createMockEqaSimulationSink,
} from "./mock-eqa-system";
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
  ["Q-1-1-2", "reviewed_no_gap"],
  ["Q-1-2-1", "gap_confirmed"],
  ["Q-1-2-2", "under_human_review"],
  ["Q-2-1-1", "not_assessed"],
  ["Q-2-1-2", "not_assessed"],
];

async function seedStatuses(
  repos: ReturnType<typeof createTenantRepositories>,
): Promise<void> {
  for (const [questionId, target] of STATUS_SEED) {
    const path: ItemStatus[] = [];
    if (target === "closed_ready") {
      path.push(
        "evidence_requested",
        "evidence_submitted",
        "ai_flagged",
        "under_human_review",
        "reviewed_no_gap",
        "closed_ready",
      );
    } else if (target === "reviewed_no_gap") {
      path.push(
        "evidence_requested",
        "evidence_submitted",
        "ai_flagged",
        "under_human_review",
        "reviewed_no_gap",
      );
    } else if (target === "gap_confirmed") {
      path.push(
        "evidence_requested",
        "evidence_submitted",
        "ai_flagged",
        "under_human_review",
        "gap_confirmed",
      );
    } else if (target === "under_human_review") {
      path.push(
        "evidence_requested",
        "evidence_submitted",
        "ai_flagged",
        "under_human_review",
      );
    } else {
      continue;
    }
    for (const to of path) {
      await repos.itemStatus.transition({
        assessmentId: ASSESSMENT,
        questionId,
        to,
      });
    }
  }
}

describe("Mock-EQA readiness simulation composed end-to-end", () => {
  let db: Database;
  let registry: TenantRegistry;
  let queue: InMemoryJobQueue;
  const catalog = loadBundledCatalog();

  beforeEach(async () => {
    db = createInMemoryDatabase();
    registry = new TenantRegistry(db, new LocalKms(randomBytes(32), "test"));
    await migrateShared(db);
    queue = new InMemoryJobQueue(
      {
        [MOCK_EQA_SIMULATION_JOB]: createMockEqaScoringHandler({
          loader: createMockEqaScoringLoader(db, catalog),
          sink: createMockEqaSimulationSink(db),
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
    return createTenantRepositories(db, sessionFor(contextOf(t), role), {
      jobQueue: queue,
    });
  }

  it("runs as an audited tenant-scoped job and persists a readiness_simulation result", async () => {
    const acme = await tenant("acme-co");
    const repos = reposFor(acme, "cae");
    await seedStatuses(repos);

    const { jobId } = await repos.mockEqa.requestSimulation({
      assessmentId: ASSESSMENT,
      contentPackId: PACK_ID,
      contentVersion: PACK_VERSION,
      locale: "en",
    });
    await queue.onIdle();

    const latest = await repos.mockEqa.getLatest(ASSESSMENT);
    expect(latest).not.toBeNull();
    expect(latest?.kind).toBe(READINESS_SIMULATION_KIND);
    expect(latest?.disclaimer).toEqual(MOCK_EQA_DISCLAIMER);
    expect(latest?.overall.level).toBe("red");

    const audit = await repos.audit.list();
    expect(
      audit.some(
        (e) => e.entity === `job:${MOCK_EQA_SIMULATION_JOB}` && e.entityId === jobId,
      ),
    ).toBe(true);
    expect(
      audit.some(
        (e) =>
          e.entity === "mock_eqa_simulation" && e.action === "create",
      ),
    ).toBe(true);
  });

  it("score matches pure computation from the same seeded statuses", async () => {
    const acme = await tenant("acme-co");
    const repos = reposFor(acme, "cae");
    await seedStatuses(repos);

    await repos.mockEqa.requestSimulation({
      assessmentId: ASSESSMENT,
      contentPackId: PACK_ID,
      contentVersion: PACK_VERSION,
    });
    await queue.onIdle();

    const pack = catalog.get(PACK_ID, PACK_VERSION);
    const questionnaire = renderQuestionnaire(pack, "en");
    const statusesByQuestion = new Map(STATUS_SEED);
    const expected = computeMockEqaSimulation({
      assessmentId: ASSESSMENT,
      assessmentName: { en: ASSESSMENT, ar: ASSESSMENT },
      locale: "en",
      questionnaire,
      statusesByQuestion,
      finalConclusions: [],
      conformanceByStandard: new Map(),
    });

    const latest = await repos.mockEqa.getLatest(ASSESSMENT);
    expect(latest?.overall.score).toBe(expected.overall.score);
    expect(latest?.overall.level).toBe(expected.overall.level);
    for (const std of latest?.domains[0]?.standards ?? []) {
      const expStd = expected.domains[0]?.standards.find(
        (s) => s.standardNumber === std.standardNumber,
      );
      expect(std.rating.score).toBe(expStd?.rating.score);
      expect(std.rating.level).toBe(expStd?.rating.level);
    }
  });

  it("cannot be represented as a formal assessment result", async () => {
    const acme = await tenant("acme-co");
    const repos = reposFor(acme, "cae");
    await seedStatuses(repos);
    await repos.mockEqa.requestSimulation({
      assessmentId: ASSESSMENT,
      contentPackId: PACK_ID,
      contentVersion: PACK_VERSION,
    });
    await queue.onIdle();

    const latest = await repos.mockEqa.getLatest(ASSESSMENT);
    expect(() => assertFormalAssessmentResult(latest)).toThrow(
      /readiness simulation as a formal assessment/i,
    );
  });

  it("forbids Board from requesting a simulation run", async () => {
    const acme = await tenant("acme-co");
    const boardRepos = reposFor(acme, "board");

    await expect(
      boardRepos.mockEqa.requestSimulation({
        assessmentId: ASSESSMENT,
        contentPackId: PACK_ID,
        contentVersion: PACK_VERSION,
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    const caeRepos = reposFor(acme, "cae");
    await seedStatuses(caeRepos);
    await caeRepos.mockEqa.requestSimulation({
      assessmentId: ASSESSMENT,
      contentPackId: PACK_ID,
      contentVersion: PACK_VERSION,
    });
    await queue.onIdle();

    const boardRead = await boardRepos.mockEqa.getLatest(ASSESSMENT);
    expect(boardRead?.kind).toBe(READINESS_SIMULATION_KIND);
  });
});
