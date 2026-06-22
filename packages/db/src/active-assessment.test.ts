import { createLocalKmsFromEnv } from "@eqa/crypto";
import { describe, expect, it } from "vitest";
import {
  ACTIVE_ASSESSMENT_KV_KEY,
  resolveActiveAssessmentId,
} from "./active-assessment";
import { createTenantRepositories } from "./repositories";
import { seedDemoFresh, seedSeeraPilot } from "./seed";
import { seedDemoFreshData } from "./seed-demo-fresh";
import { seedSeeraPilotDemoData } from "./seed-demo-data";
import { EMPTY_DEMO_ASSESSMENT_ID } from "./seed-empty-assessment";
import { contextOf, sessionFor } from "./testing/fixtures";
import { createInMemoryDatabase } from "./testing/in-memory";
import { PILOT_ASSESSMENT_ID } from "./ui-loaders/pilot-assessment";

describe("resolveActiveAssessmentId", () => {
  it("defaults to the Seera pilot assessment when no pointer is set", async () => {
    const db = createInMemoryDatabase();
    const kms = createLocalKmsFromEnv();
    const seera = await seedSeeraPilot(db, kms);
    const repos = createTenantRepositories(
      db,
      sessionFor(contextOf(seera), "cae"),
    );
    await expect(resolveActiveAssessmentId(repos.kv)).resolves.toBe(
      PILOT_ASSESSMENT_ID,
    );
    await db.close();
  });

  it("reads per-tenant pointers after demo-fresh and seera seeds", async () => {
    const db = createInMemoryDatabase();
    const kms = createLocalKmsFromEnv();
    const seera = await seedSeeraPilot(db, kms);
    await seedSeeraPilotDemoData(db, kms, seera);
    const fresh = await seedDemoFresh(db, kms);
    await seedDemoFreshData(db, fresh);

    const freshRepos = createTenantRepositories(
      db,
      sessionFor(contextOf(fresh), "cae"),
    );
    await expect(resolveActiveAssessmentId(freshRepos.kv)).resolves.toBe(
      EMPTY_DEMO_ASSESSMENT_ID,
    );

    const seeraRepos = createTenantRepositories(
      db,
      sessionFor(contextOf(seera), "cae"),
    );
    await expect(resolveActiveAssessmentId(seeraRepos.kv)).resolves.toBe(
      PILOT_ASSESSMENT_ID,
    );
    await expect(seeraRepos.kv.get(ACTIVE_ASSESSMENT_KV_KEY)).resolves.toBe(
      PILOT_ASSESSMENT_ID,
    );
    await db.close();
  });
});
