import { randomBytes } from "node:crypto";
import { LocalKms, TenantCipher } from "@eqa/crypto";
import type { TenantDescriptor } from "@eqa/tenant";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clientFor, type Database } from "./database";
import { migrateShared } from "./migrate";
import { TenantRegistry } from "./registry";
import { createTenantRepositories } from "./repositories";
import { contextOf, sessionFor } from "./testing/fixtures";
import { createInMemoryDatabase } from "./testing/in-memory";

const masterKey = randomBytes(32);

function kms(): LocalKms {
  return new LocalKms(masterKey, "test-master");
}

describe("audit logging (cross-cutting)", () => {
  let db: Database;
  let registry: TenantRegistry;
  let sharedKms: LocalKms;

  beforeEach(async () => {
    db = createInMemoryDatabase();
    sharedKms = kms();
    registry = new TenantRegistry(db, sharedKms);
    await migrateShared(db);
  });

  afterEach(async () => {
    await db.close();
  });

  async function tenant(slug: string): Promise<TenantDescriptor> {
    return registry.createTenant({ slug, name: slug });
  }

  it("auto-audits repository mutations with who/what/when/old/new", async () => {
    const acme = await tenant("acme-co");
    const session = sessionFor(contextOf(acme), "cae");
    const repos = createTenantRepositories(db, session);

    await repos.kv.set("k", "v1");
    await repos.kv.set("k", "v2");
    await repos.settings.set("flag", "on");

    const entries = await repos.audit.list();
    expect(entries).toHaveLength(3);

    expect(entries[0]).toMatchObject({
      seq: 1,
      action: "create",
      entity: "tenant_kv",
      entityId: "k",
      actorRole: "cae",
      oldValue: null,
      newValue: JSON.stringify("v1"),
    });
    expect(entries[0]?.actorUserId).toBe(session.userId);
    expect(typeof entries[0]?.occurredAt).toBe("string");

    expect(entries[1]).toMatchObject({
      seq: 2,
      action: "update",
      oldValue: JSON.stringify("v1"),
      newValue: JSON.stringify("v2"),
    });
    expect(entries[2]).toMatchObject({
      seq: 3,
      action: "create",
      entity: "tenant_settings",
    });

    expect(await repos.audit.verify()).toEqual({ valid: true });
  });

  it("exposes an append/edit/delete-free audit surface to the app", async () => {
    const acme = await tenant("acme-co");
    const repos = createTenantRepositories(db, sessionFor(contextOf(acme)));
    const surface = repos.audit as unknown as Record<string, unknown>;

    expect(typeof surface.list).toBe("function");
    expect(typeof surface.verify).toBe("function");
    expect(surface.append).toBeUndefined();
    expect(surface.update).toBeUndefined();
    expect(surface.delete).toBeUndefined();
  });

  it("detects out-of-band modification of an entry", async () => {
    const acme = await tenant("acme-co");
    const repos = createTenantRepositories(db, sessionFor(contextOf(acme)));
    await repos.kv.set("k", "v1");
    await repos.kv.set("k", "v2");

    expect((await repos.audit.verify()).valid).toBe(true);

    // Simulate a storage-layer attacker editing a stored entry. The app itself
    // has no path to do this; the chain still catches it.
    await clientFor(db).query(
      `UPDATE "${acme.schemaName}".audit_log SET new_value = $1 WHERE seq = 1`,
      [JSON.stringify("HACKED")],
    );

    const result = await repos.audit.verify();
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.atSeq).toBe(1);
    }
  });

  it("detects out-of-band removal of an entry", async () => {
    const acme = await tenant("acme-co");
    const repos = createTenantRepositories(db, sessionFor(contextOf(acme)));
    await repos.kv.set("a", "1");
    await repos.kv.set("b", "2");
    await repos.kv.set("c", "3");

    await clientFor(db).query(
      `DELETE FROM "${acme.schemaName}".audit_log WHERE seq = 2`,
    );

    expect((await repos.audit.verify()).valid).toBe(false);
  });

  it("isolates audit entries per tenant", async () => {
    const acme = await tenant("acme-co");
    const beta = await tenant("beta-co");

    const acmeRepos = createTenantRepositories(db, sessionFor(contextOf(acme)));
    const betaRepos = createTenantRepositories(db, sessionFor(contextOf(beta)));

    await acmeRepos.kv.set("only-acme", "value");

    expect(await acmeRepos.audit.list()).toHaveLength(1);
    expect(await betaRepos.audit.list()).toEqual([]);
  });
});

describe("application-level field encryption", () => {
  let db: Database;
  let registry: TenantRegistry;
  let sharedKms: LocalKms;

  beforeEach(async () => {
    db = createInMemoryDatabase();
    sharedKms = kms();
    registry = new TenantRegistry(db, sharedKms);
    await migrateShared(db);
  });

  afterEach(async () => {
    await db.close();
  });

  it("encrypts sensitive fields at rest and never leaks plaintext", async () => {
    const acme = await registry.createTenant({
      slug: "acme-co",
      name: "Acme",
    });
    const cipher = new TenantCipher(
      sharedKms,
      await registry.getEncryptedDataKey(acme.slug),
    );
    const repos = createTenantRepositories(db, sessionFor(contextOf(acme)), {
      cipher,
    });

    const secure = repos.secure;
    if (!secure) throw new Error("expected a secure repository");

    const ssn = "123-45-6789";
    await secure.set("ssn", ssn);

    // The stored column is ciphertext, not the plaintext value.
    const { rows } = await clientFor(db).query<{ ciphertext: string }>(
      `SELECT ciphertext FROM "${acme.schemaName}".tenant_secure_fields WHERE key = $1`,
      ["ssn"],
    );
    const stored = rows[0]?.ciphertext ?? "";
    expect(stored.length).toBeGreaterThan(0);
    expect(stored).not.toContain(ssn);

    // It round-trips back to plaintext on read.
    expect(await secure.get("ssn")).toBe(ssn);

    // The audit entry for the sensitive write is redacted — no plaintext leak.
    const entries = await repos.audit.list();
    const secureEntry = entries.find(
      (e) => e.entity === "tenant_secure_fields",
    );
    expect(secureEntry).toBeDefined();
    expect(JSON.stringify(secureEntry)).not.toContain(ssn);
  });
});
