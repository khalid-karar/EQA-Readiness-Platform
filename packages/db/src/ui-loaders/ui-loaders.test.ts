import { randomBytes } from "node:crypto";
import { LocalKms } from "@eqa/crypto";
import { MissingTenantContextError } from "@eqa/tenant";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../database";
import { migrateShared } from "../migrate";
import { seedSeeraPilot } from "../seed";
import { seedSeeraPilotDemoData } from "../seed-demo-data";
import { contextOf, sessionFor } from "../testing/fixtures";
import { createInMemoryDatabase } from "../testing/in-memory";
import {
  createAssessmentLoader,
  createDashboardLoader,
  createEvidenceLoader,
  createEvidencePackLoader,
  createFindingsLoader,
  createMockEqaLoader,
  createRemediationLoader,
  createWorkingPapersLoader,
} from "./index";

describe("UI loaders (tenant-scoped repositories)", () => {
  let db: Database;

  beforeEach(() => {
    db = createInMemoryDatabase();
  });

  afterEach(async () => {
    await db.close();
  });

  async function seedTenant() {
    const kms = new LocalKms(randomBytes(32), "test-ui-loaders");
    await migrateShared(db);
    const tenant = await seedSeeraPilot(db, kms);
    await seedSeeraPilotDemoData(db, kms, tenant);
    return tenant;
  }

  it("fail closed without tenant session context", async () => {
    await seedTenant();
    const loaders = [
      createDashboardLoader(db),
      createAssessmentLoader(db),
      createFindingsLoader(db),
      createEvidenceLoader(db),
      createRemediationLoader(db),
      createWorkingPapersLoader(db),
      createMockEqaLoader(db),
      createEvidencePackLoader(db),
    ];

    for (const loader of loaders) {
      await expect(
        "loadInput" in loader
          ? loader.loadInput(null, "en", "cae")
          : "loadTrackerInput" in loader
            ? loader.loadTrackerInput(null, "en", "cae")
            : loader.load(null, "en", "cae"),
      ).rejects.toBeInstanceOf(MissingTenantContextError);
    }
  });

  it("dashboard loader reads tenant-scoped statuses", async () => {
    const tenant = await seedTenant();
    const session = sessionFor(contextOf(tenant), "cae");
    const input = await createDashboardLoader(db).loadInput(session, "en", "cae");
    expect(input.statusesByQuestion.size).toBeGreaterThan(0);
    expect(input.pendingReviewCount).toBeGreaterThanOrEqual(1);
  });

  it("assessment loader reads tenant-scoped responses", async () => {
    const tenant = await seedTenant();
    const data = await createAssessmentLoader(db).load(
      sessionFor(contextOf(tenant), "cae"),
      "en",
      "cae",
    );
    expect(data.responses.length).toBeGreaterThan(0);
  });

  it("findings loader reads drafts and conclusions", async () => {
    const tenant = await seedTenant();
    const data = await createFindingsLoader(db).load(
      sessionFor(contextOf(tenant), "cae"),
      "en",
      "cae",
    );
    expect(data.drafts.length).toBeGreaterThan(0);
    expect(data.conclusions.length).toBeGreaterThan(0);
  });

  it("evidence loader lists tenant evidence metadata", async () => {
    const tenant = await seedTenant();
    const data = await createEvidenceLoader(db).load(
      sessionFor(contextOf(tenant), "cae"),
      "en",
      "cae",
    );
    expect(data.items.length).toBeGreaterThan(0);
  });

  it("remediation loader reads tracker rows", async () => {
    const tenant = await seedTenant();
    const view = await createRemediationLoader(db).loadTrackerView(
      sessionFor(contextOf(tenant), "cae"),
      "en",
      "cae",
    );
    expect(view.items.length).toBeGreaterThan(0);
  });

  it("working-papers loader reads checklist items", async () => {
    const tenant = await seedTenant();
    const data = await createWorkingPapersLoader(db).load(
      sessionFor(contextOf(tenant), "cae"),
      "en",
      "cae",
    );
    expect(data.engagement).not.toBeNull();
    expect(data.engagement?.items.length).toBeGreaterThan(0);
  });

  it("mock-eqa loader builds scoring input from tenant data", async () => {
    const tenant = await seedTenant();
    const data = await createMockEqaLoader(db).load(
      sessionFor(contextOf(tenant), "cae"),
      "en",
      "cae",
    );
    expect(data.scoringInput.statusesByQuestion.size).toBeGreaterThan(0);
    expect(data.persistedSimulation).toBeNull();
  });

  it("evidence-pack loader assembles tenant-scoped preview input", async () => {
    const tenant = await seedTenant();
    const data = await createEvidencePackLoader(db).load(
      sessionFor(contextOf(tenant), "cae"),
      "en",
      "cae",
    );
    expect(data.assemblyInput.responses.length).toBeGreaterThan(0);
    expect(data.assemblyInput.evidenceMetadata.length).toBeGreaterThan(0);
    expect(data.persistedManifest).toBeNull();
  });
});
