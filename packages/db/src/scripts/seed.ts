import { createLocalKmsFromEnv } from "@eqa/crypto";
import type { Database } from "../database";
import { createPgDatabase } from "../pg-backend";
import { seedBetaCo, seedSeeraPilot } from "../seed";
import { seedBetaCoDemoData, seedSeeraPilotDemoData } from "../seed-demo-data";

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
    const seera = await seedSeeraPilot(db, kms);
    await seedSeeraPilotDemoData(db, kms, seera);
    const beta = await seedBetaCo(db, kms);
    await seedBetaCoDemoData(db, beta);
    console.log(
      `[seed] Tenants ready: ${seera.name} (slug=${seera.slug}, schema=${seera.schemaName}, id=${seera.id}); ${beta.name} (slug=${beta.slug}, schema=${beta.schemaName}, id=${beta.id})`,
    );
  } finally {
    await db.close();
  }
}

main().catch((error: unknown) => {
  console.error("[seed] Failed:", error);
  process.exitCode = 1;
});
