import type { Kms } from "@eqa/crypto";
import type { TenantDescriptor } from "@eqa/tenant";
import type { Database } from "./database";
import { migrateShared } from "./migrate";
import { TenantRegistry } from "./registry";

/** The single synthetic pilot tenant. Synthetic data only — never real data. */
export const SEERA_PILOT = {
  slug: "seera-pilot",
  name: "Seera-pilot",
} as const;

/** Synthetic beta tenant used for tenant-isolation checks. */
export const BETA_CO = {
  slug: "beta-co",
  name: "Beta Co",
} as const;

/**
 * Idempotently seeds the synthetic "Seera-pilot" tenant: runs shared
 * migrations, then creates the tenant (registry row + tenant schema + wrapped
 * data key) if it does not already exist.
 */
export async function seedSeeraPilot(
  db: Database,
  kms: Kms,
): Promise<TenantDescriptor> {
  await migrateShared(db);
  const registry = new TenantRegistry(db, kms);

  const existing = await registry.findBySlug(SEERA_PILOT.slug);
  if (existing) {
    return existing;
  }
  return registry.createTenant({
    slug: SEERA_PILOT.slug,
    name: SEERA_PILOT.name,
  });
}

/**
 * Idempotently seeds the synthetic "Beta Co" tenant: runs shared migrations,
 * then creates the tenant (registry row + tenant schema + wrapped data key) if
 * it does not already exist.
 */
export async function seedBetaCo(
  db: Database,
  kms: Kms,
): Promise<TenantDescriptor> {
  await migrateShared(db);
  const registry = new TenantRegistry(db, kms);

  const existing = await registry.findBySlug(BETA_CO.slug);
  if (existing) {
    return existing;
  }
  return registry.createTenant({
    slug: BETA_CO.slug,
    name: BETA_CO.name,
  });
}
