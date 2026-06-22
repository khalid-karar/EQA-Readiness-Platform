import type { TenantDescriptor } from "@eqa/tenant";
import { setActiveAssessmentPointer } from "./active-assessment";
import type { Database } from "./database";
import { createTenantRepositories } from "./repositories";
import {
  EMPTY_DEMO_ASSESSMENT_ID,
  seedEmptyAssessment,
} from "./seed-empty-assessment";
import { contextOf, sessionFor } from "./testing/fixtures";

const DEMO_FRESH_SEED_MARKER = "demo-fresh-seed-v1";

/**
 * Idempotently seeds demo-fresh with ONLY the empty synthetic assessment:
 * content-pinned metadata in KV, active-assessment pointer, zero workflow rows.
 */
export async function seedDemoFreshData(
  db: Database,
  tenant: TenantDescriptor,
): Promise<void> {
  const cae = createTenantRepositories(db, sessionFor(contextOf(tenant), "cae"));
  if ((await cae.kv.get(DEMO_FRESH_SEED_MARKER)) === "done") {
    return;
  }

  await seedEmptyAssessment(db, tenant, EMPTY_DEMO_ASSESSMENT_ID);
  await setActiveAssessmentPointer(cae.kv, EMPTY_DEMO_ASSESSMENT_ID);
  await cae.kv.set(DEMO_FRESH_SEED_MARKER, "done");
}
