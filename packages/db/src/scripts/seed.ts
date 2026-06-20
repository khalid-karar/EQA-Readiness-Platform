import { createLocalKmsFromEnv } from "@eqa/crypto";
import type { Database } from "../database";
import { createPgDatabase } from "../pg-backend";
import { seedSeeraPilot } from "../seed";
import { seedSeeraPilotDemoData } from "../seed-demo-data";

/**
 * Runnable seed for local/dev environments.
 *
 * - With DATABASE_URL set, seeds a real Postgres.
 * - Without it, seeds an ephemeral in-memory database to demonstrate the flow
 *   (the result is logged but not persisted).
 *
 * Synthetic data only.
 */
async function main(): Promise<void> {
  const kms = createLocalKmsFromEnv();
  const connectionString = process.env.DATABASE_URL;

  let db: Database;
  if (connectionString) {
    db = createPgDatabase({ connectionString });
  } else {
    console.warn(
      "[seed] DATABASE_URL not set — seeding an ephemeral in-memory database (not persisted).",
    );
    const { createInMemoryDatabase } = await import("../testing/in-memory");
    db = createInMemoryDatabase();
  }

  try {
    const tenant = await seedSeeraPilot(db, kms);
    await seedSeeraPilotDemoData(db, kms, tenant);
    console.log(
      `[seed] Tenant ready: ${tenant.name} (slug=${tenant.slug}, schema=${tenant.schemaName}, id=${tenant.id})`,
    );
  } finally {
    await db.close();
  }
}

main().catch((error: unknown) => {
  console.error("[seed] Failed:", error);
  process.exitCode = 1;
});
