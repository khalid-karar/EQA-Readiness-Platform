import { randomBytes } from "node:crypto";
import { LocalKms } from "@eqa/crypto";
import {
  MissingTenantContextError,
  resolveTenantContext,
  type TenantContext,
} from "@eqa/tenant";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clientFor, type Database } from "./database";
import {
  createTenantSchema,
  listTenantSchemas,
  migrateShared,
  schemaIsProvisioned,
} from "./migrate";
import { TenantRegistry } from "./registry";
import { createTenantRepositories } from "./repositories";
import { ScopedExecutor } from "./scoped/scoped-executor";
import { seedSeeraPilot } from "./seed";
import { contextOf, sessionFor } from "./testing/fixtures";
import { createInMemoryDatabase } from "./testing/in-memory";

function kms(): LocalKms {
  return new LocalKms(randomBytes(32), "test-master");
}

async function tenantContext(
  registry: TenantRegistry,
  slug: string,
): Promise<TenantContext> {
  const resolution = await resolveTenantContext(
    { pathname: "/data", tenantSlug: slug },
    registry,
  );
  if (resolution.kind !== "tenant") {
    throw new Error(`Expected tenant resolution for ${slug}`);
  }
  return resolution.context;
}

describe("tenant-scoped data access", () => {
  let db: Database;

  beforeEach(() => {
    db = createInMemoryDatabase();
  });

  afterEach(async () => {
    await db.close();
  });

  it("fails when a query is attempted without tenant context", () => {
    expect(() => createTenantRepositories(db, null)).toThrow(
      MissingTenantContextError,
    );
    expect(() => createTenantRepositories(db, undefined)).toThrow(
      MissingTenantContextError,
    );
    expect(() => new ScopedExecutor(db, null)).toThrow(
      MissingTenantContextError,
    );
    // A context with a tampered/invalid schema is also rejected.
    expect(
      () =>
        new ScopedExecutor(db, {
          tenantId: "x",
          slug: "x",
          name: "x",
          schemaName: 'evil"; drop schema',
        }),
    ).toThrow(MissingTenantContextError);
  });

  it("isolates one tenant's data from another", async () => {
    const sharedKms = kms();
    const registry = new TenantRegistry(db, sharedKms);
    await seedSeeraPilot(db, sharedKms);

    const a = await registry.createTenant({
      slug: "alpha-co",
      name: "Alpha Co",
    });
    const b = await registry.createTenant({ slug: "beta-co", name: "Beta Co" });

    const repoA = createTenantRepositories(db, sessionFor(contextOf(a)));
    const repoB = createTenantRepositories(db, sessionFor(contextOf(b)));

    await repoA.kv.set("secret", "alpha-only-value");

    expect(await repoA.kv.get("secret")).toBe("alpha-only-value");
    expect(await repoB.kv.get("secret")).toBeNull();
    expect(await repoB.kv.all()).toEqual([]);
  });

  it("creates a second tenant schema via the tooling", async () => {
    const registry = new TenantRegistry(db, kms());
    await seedSeeraPilot(db, kms());

    // Second tenant through the registry (which uses createTenantSchema).
    await registry.createTenant({ slug: "second-tenant", name: "Second" });
    expect(await schemaIsProvisioned(db, "tenant_second_tenant")).toBe(true);

    // And a brand-new schema purely through the migration tooling.
    await createTenantSchema(db, "tenant_tooling_only");
    expect(await schemaIsProvisioned(db, "tenant_tooling_only")).toBe(true);

    const schemas = await listTenantSchemas(db);
    expect(schemas).toContain("tenant_second_tenant");
    expect(schemas).toContain("tenant_tooling_only");

    // The new schema is actually usable.
    const ctx = await tenantContext(registry, "second-tenant");
    const repo = createTenantRepositories(db, sessionFor(ctx));
    await repo.kv.set("k", "v");
    expect(await repo.kv.get("k")).toBe("v");
  });
});

describe("per-tenant key material", () => {
  let db: Database;
  const logs: string[] = [];

  const captureWrite = ((chunk: unknown) => {
    logs.push(String(chunk));
    return true;
  }) as never;

  beforeEach(() => {
    db = createInMemoryDatabase();
    logs.length = 0;
    for (const method of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
        logs.push(args.map((a) => String(a)).join(" "));
      });
    }
    vi.spyOn(process.stdout, "write").mockImplementation(captureWrite);
    vi.spyOn(process.stderr, "write").mockImplementation(captureWrite);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await db.close();
  });

  it("never stores plaintext key material and only persists ciphertext", async () => {
    const registry = new TenantRegistry(db, kms());
    await migrateShared(db);
    const tenant = await registry.createTenant({
      slug: "seera-pilot",
      name: "Seera-pilot",
    });

    // Capture the real plaintext data key (in memory only).
    const { plaintextB64, plaintextHex } = await registry.withTenantDataKey(
      tenant.slug,
      (dataKey) => ({
        plaintextB64: dataKey.toString("base64"),
        plaintextHex: dataKey.toString("hex"),
      }),
    );

    // The stored column is ciphertext, not the plaintext key.
    const { rows } = await clientFor(db).query<{
      data_key_ciphertext: string;
    }>("SELECT data_key_ciphertext FROM platform.tenants WHERE slug = $1", [
      tenant.slug,
    ]);
    const stored = rows[0]?.data_key_ciphertext ?? "";
    expect(stored.length).toBeGreaterThan(0);
    expect(stored).not.toBe(plaintextB64);
    expect(stored).not.toContain(plaintextB64);

    // Nothing logged the plaintext key (base64 or hex).
    const allLogs = logs.join("\n");
    expect(allLogs).not.toContain(plaintextB64);
    expect(allLogs).not.toContain(plaintextHex);

    // The directory result carries no key material at all.
    const descriptor = await registry.findBySlug(tenant.slug);
    expect(JSON.stringify(descriptor)).not.toContain(plaintextB64);
    expect(JSON.stringify(descriptor)).not.toContain(stored);
  });
});
