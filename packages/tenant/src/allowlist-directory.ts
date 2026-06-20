import type { TenantDescriptor, TenantDirectory } from "./directory";
import { tenantSchemaName } from "./schema";

/**
 * In-memory tenant directory backed by a fixed descriptor list. Used at the
 * request edge (middleware) where the full registry DB is unavailable.
 */
export function createAllowlistTenantDirectory(
  descriptors: readonly TenantDescriptor[],
): TenantDirectory {
  const bySlug = new Map(descriptors.map((d) => [d.slug, d]));
  return {
    findBySlug: (slug) => Promise.resolve(bySlug.get(slug) ?? null),
  };
}

/** Builds an allowlist directory from slugs (active tenants, derived schema names). */
export function createAllowlistTenantDirectoryFromSlugs(
  slugs: readonly string[],
): TenantDirectory {
  return createAllowlistTenantDirectory(
    slugs.map((slug) => ({
      id: slug,
      slug,
      name: slug,
      schemaName: tenantSchemaName(slug),
      status: "active",
    })),
  );
}
