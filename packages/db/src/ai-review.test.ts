import { randomBytes } from "node:crypto";
import {
  AI_REVIEW_JOB,
  AiReviewService,
  createAiReviewHandler,
  LocalStubModelAdapter,
  type EvidenceReviewInput,
} from "@eqa/ai";
import { LocalKms } from "@eqa/crypto";
import { InMemoryJobQueue } from "@eqa/jobs";
import type { TenantDescriptor } from "@eqa/tenant";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Database } from "./database";
import { createTenantJobAuditPort } from "./evidence-system";
import { migrateShared } from "./migrate";
import { TenantRegistry } from "./registry";
import { createTenantRepositories } from "./repositories";
import { contextOf, sessionFor } from "./testing/fixtures";
import { createInMemoryDatabase } from "./testing/in-memory";

function reviewInput(): EvidenceReviewInput {
  return {
    promptVersion: "prompt-2.1",
    rubricVersion: "rubric-1.0",
    excerpts: ["Khalid Al-Otaibi confirmed the reconciliation was complete."],
    metadata: { standard: "S1.1", questionId: "Q-1-1-1" },
    summary: "Synthetic redacted summary.",
    identities: [{ name: "Khalid Al-Otaibi", role: "cae" }],
  };
}

/**
 * Composes the Step 9 AI review job with the Step 6.5 queue and the REAL Step 4
 * tenant job-audit port, proving the AI call runs tenant-scoped and its outcome
 * is audited into the acting tenant's immutable, hash-chained log — and only
 * that tenant's log.
 */
describe("AI review job composed with the tenant job-audit port (Step 9)", () => {
  let db: Database;
  let registry: TenantRegistry;
  let queue: InMemoryJobQueue;

  beforeEach(async () => {
    db = createInMemoryDatabase();
    registry = new TenantRegistry(db, new LocalKms(randomBytes(32), "test"));
    await migrateShared(db);
    const service = new AiReviewService(new LocalStubModelAdapter());
    queue = new InMemoryJobQueue(
      { [AI_REVIEW_JOB]: createAiReviewHandler({ service }) },
      { auditPort: createTenantJobAuditPort(db) },
    );
  });

  afterEach(async () => {
    await db.close();
  });

  function tenant(slug: string): Promise<TenantDescriptor> {
    return registry.createTenant({ slug, name: slug });
  }

  it("audits the AI call's provenance into the acting tenant's log only", async () => {
    const acme = await tenant("acme-co");
    const beta = await tenant("beta-co");

    await queue.enqueue({
      name: AI_REVIEW_JOB,
      tenant: contextOf(acme),
      payload: reviewInput(),
    });
    await queue.onIdle();

    // The acting tenant's audit log holds the AI job outcome with provenance.
    const acmeRepos = createTenantRepositories(
      db,
      sessionFor(contextOf(acme), "cae"),
    );
    const entries = await acmeRepos.audit.list();
    const jobEntry = entries.find((e) => e.entity === `job:${AI_REVIEW_JOB}`);
    expect(jobEntry).toBeDefined();
    expect(jobEntry?.action).toBe("status_change");

    const recorded = JSON.parse(jobEntry?.newValue ?? "null") as {
      status: string;
      output: {
        promptVersion: string;
        rubricVersion: string;
        modelAdapter: string;
        adapterLocation: string;
      };
    };
    expect(recorded.status).toBe("completed");
    expect(recorded.output.promptVersion).toBe("prompt-2.1");
    expect(recorded.output.rubricVersion).toBe("rubric-1.0");
    expect(recorded.output.modelAdapter).toBe("local-stub");
    expect(recorded.output.adapterLocation).toBe("local");

    // The hash chain still verifies, and the other tenant has no such entry.
    expect((await acmeRepos.audit.verify()).valid).toBe(true);
    const betaRepos = createTenantRepositories(
      db,
      sessionFor(contextOf(beta), "cae"),
    );
    expect(
      (await betaRepos.audit.list()).some((e) => e.entity.startsWith("job:")),
    ).toBe(false);
  });
});
