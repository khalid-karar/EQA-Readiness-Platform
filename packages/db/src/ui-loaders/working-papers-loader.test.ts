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
import { createWorkingPapersLoader } from "./working-papers-loader";

describe("working-papers loader auth", () => {
  let db: Database;

  beforeEach(() => {
    db = createInMemoryDatabase();
  });

  afterEach(async () => {
    await db.close();
  });

  async function seedTenant() {
    const kms = new LocalKms(randomBytes(32), "test-wp-loader-auth");
    await migrateShared(db);
    const tenant = await seedSeeraPilot(db, kms);
    await seedSeeraPilotDemoData(db, kms, tenant);
    return tenant;
  }

  it("fails closed without tenant session context", async () => {
    await seedTenant();
    await expect(
      createWorkingPapersLoader(db).load(null, "en", "cae"),
    ).rejects.toBeInstanceOf(MissingTenantContextError);
  });

  it("loads checklist items for a verified CAE session", async () => {
    const tenant = await seedTenant();
    const data = await createWorkingPapersLoader(db).load(
      sessionFor(contextOf(tenant), "cae"),
      "en",
      "cae",
    );
    expect(data.engagement).not.toBeNull();
    expect(data.engagement?.items.length).toBeGreaterThan(0);
  });
});
