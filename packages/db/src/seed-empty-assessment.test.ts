import { randomBytes } from "node:crypto";
import { loadBundledCatalog } from "@eqa/content";
import { LocalKms } from "@eqa/crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "./database";
import { migrateShared } from "./migrate";
import { createTenantRepositories } from "./repositories";
import { SEERA_PILOT, seedSeeraPilot } from "./seed";
import { seedSeeraPilotDemoData } from "./seed-demo-data";
import {
  assessmentContentPinKey,
  EMPTY_DEMO_ASSESSMENT_ID,
  seedEmptyAssessment,
} from "./seed-empty-assessment";
import { SEERA_DEMO_ASSESSMENT_ID } from "@eqa/workflows";
import { contextOf, sessionFor } from "./testing/fixtures";
import { createInMemoryDatabase } from "./testing/in-memory";

describe("seedEmptyAssessment (synthetic only)", () => {
  let db: Database;

  beforeEach(() => {
    db = createInMemoryDatabase();
  });

  afterEach(async () => {
    await db.close();
  });

  it("registers a content-pinned assessment with zero workflow rows", async () => {
    const kms = new LocalKms(randomBytes(32), "test-empty-assessment");
    await migrateShared(db);
    const tenant = await seedSeeraPilot(db, kms);
    const pin = await seedEmptyAssessment(db, tenant);

    expect(pin.assessmentId).toBe(EMPTY_DEMO_ASSESSMENT_ID);

    const catalog = loadBundledCatalog();
    const pack = catalog.get(pin.contentPackId, pin.version);
    expect(pin.contentHash).toBe(pack.contentHash);

    const repos = createTenantRepositories(
      db,
      sessionFor(contextOf(tenant), "cae"),
    );

    const storedPin = await repos.kv.get(
      assessmentContentPinKey(EMPTY_DEMO_ASSESSMENT_ID),
    );
    expect(storedPin).toBe(JSON.stringify(pin));

    const responses = await repos.responses.getForAssessment(
      EMPTY_DEMO_ASSESSMENT_ID,
    );
    expect(responses).toHaveLength(0);

    const statuses = await repos.itemStatus.getForAssessment(
      EMPTY_DEMO_ASSESSMENT_ID,
    );
    expect(statuses).toHaveLength(0);

    const drafts = await repos.draftFindings.getForAssessment(
      EMPTY_DEMO_ASSESSMENT_ID,
    );
    expect(drafts).toHaveLength(0);

    const conclusions = await repos.humanReview.getForAssessment(
      EMPTY_DEMO_ASSESSMENT_ID,
    );
    expect(conclusions).toHaveLength(0);

    const remediations = await repos.remediation.listForAssessment(
      EMPTY_DEMO_ASSESSMENT_ID,
    );
    expect(remediations).toHaveLength(0);
  });

  it("is idempotent and does not disturb the existing Seera demo seed", async () => {
    const kms = new LocalKms(randomBytes(32), "test-empty-idempotent");
    await migrateShared(db);
    const tenant = await seedSeeraPilot(db, kms);
    await seedSeeraPilotDemoData(db, kms, tenant);
    await seedEmptyAssessment(db, tenant);
    await seedEmptyAssessment(db, tenant);

    const repos = createTenantRepositories(
      db,
      sessionFor(contextOf(tenant), "cae"),
    );

    const seeraResponses = await repos.responses.getForAssessment(
      SEERA_DEMO_ASSESSMENT_ID,
    );
    expect(seeraResponses.length).toBeGreaterThan(0);

    const emptyResponses = await repos.responses.getForAssessment(
      EMPTY_DEMO_ASSESSMENT_ID,
    );
    expect(emptyResponses).toHaveLength(0);
  });
});
