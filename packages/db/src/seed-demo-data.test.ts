import { randomBytes } from "node:crypto";
import { LocalKms } from "@eqa/crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "./database";
import { migrateShared } from "./migrate";
import { createTenantRepositories } from "./repositories";
import { SEERA_PILOT, seedSeeraPilot } from "./seed";
import { seedSeeraPilotDemoData } from "./seed-demo-data";
import { SEERA_DEMO_ASSESSMENT_ID, SEERA_DEMO_QUESTIONS } from "@eqa/workflows";
import { contextOf, sessionFor } from "./testing/fixtures";
import { createInMemoryDatabase } from "./testing/in-memory";

describe("seedSeeraPilot demo data (synthetic only)", () => {
  let db: Database;

  beforeEach(() => {
    db = createInMemoryDatabase();
  });

  afterEach(async () => {
    await db.close();
  });

  it("seeds demo assessment rows idempotently", async () => {
    const kms = new LocalKms(randomBytes(32), "test-seed-demo");
    await migrateShared(db);
    const tenant = await seedSeeraPilot(db, kms);
    await seedSeeraPilotDemoData(db, kms, tenant);
    expect(tenant.slug).toBe(SEERA_PILOT.slug);

    const repos = createTenantRepositories(
      db,
      sessionFor(contextOf(tenant), "cae"),
    );
    const responses = await repos.responses.getForAssessment(
      SEERA_DEMO_ASSESSMENT_ID,
    );
    expect(responses.length).toBeGreaterThan(0);

    const charterStatus = await repos.itemStatus.getStatus(
      SEERA_DEMO_ASSESSMENT_ID,
      SEERA_DEMO_QUESTIONS.ETHICS_CHARTER,
    );
    expect(charterStatus?.status).toBe("closed_ready");

    const pendingDraft = await repos.draftFindings.getForAssessment(
      SEERA_DEMO_ASSESSMENT_ID,
    );
    expect(
      pendingDraft.some(
        (d) => d.questionId === SEERA_DEMO_QUESTIONS.COI_DECLARATIONS,
      ),
    ).toBe(true);

    const remediations = await repos.remediation.listForAssessment(
      SEERA_DEMO_ASSESSMENT_ID,
    );
    expect(remediations.some((r) => r.closedAt !== null)).toBe(true);
    expect(remediations.some((r) => r.closedAt === null)).toBe(true);

    await seedSeeraPilotDemoData(db, kms, tenant);
    const responsesAgain = await repos.responses.getForAssessment(
      SEERA_DEMO_ASSESSMENT_ID,
    );
    expect(responsesAgain).toHaveLength(responses.length);
  });
});
