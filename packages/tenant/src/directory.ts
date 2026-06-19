/** A tenant record as seen by tenant resolution (no secret material). */
export interface TenantDescriptor {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly schemaName: string;
  readonly status: "active" | "suspended";
}

/**
 * Port for looking tenants up by slug. Defined here (not in @eqa/db) so that
 * tenant resolution does not depend on the data layer — @eqa/db provides the
 * adapter. This keeps the dependency direction db -> tenant, with no cycle.
 */
export interface TenantDirectory {
  findBySlug(slug: string): Promise<TenantDescriptor | null>;
}
