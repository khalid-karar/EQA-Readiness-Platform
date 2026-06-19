import { randomBytes } from "node:crypto";
import { LocalKms } from "@eqa/crypto";
import {
  authenticate,
  ForbiddenError,
  KeycloakIdentityProvider,
} from "@eqa/auth";
import { generateKeyPair, type KeyLike, SignJWT } from "jose";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Database } from "./database";
import { migrateShared } from "./migrate";
import { TenantRegistry } from "./registry";
import { createTenantRepositories } from "./repositories";
import { contextOf, sessionFor } from "./testing/fixtures";
import { createInMemoryDatabase } from "./testing/in-memory";

const ISSUER = "https://kc.test/realms/eqa";
const AUDIENCE = "eqa-web";

function kms(): LocalKms {
  return new LocalKms(randomBytes(32), "test-master");
}

async function issueToken(
  privateKey: KeyLike,
  tenant: string,
  role: string,
): Promise<string> {
  return new SignJWT({ tenant, role, amr: ["otp"] })
    .setProtectedHeader({ alg: "RS256" })
    .setSubject(`user-${tenant}`)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
}

describe("RBAC enforced at the data layer", () => {
  let db: Database;
  let registry: TenantRegistry;

  beforeEach(async () => {
    db = createInMemoryDatabase();
    registry = new TenantRegistry(db, kms());
    await migrateShared(db);
  });

  afterEach(async () => {
    await db.close();
  });

  it("holds each role's permission boundary on repository operations", async () => {
    const acme = contextOf(
      await registry.createTenant({ slug: "acme", name: "Acme" }),
    );

    const cae = createTenantRepositories(db, sessionFor(acme, "cae"));
    const staff = createTenantRepositories(db, sessionFor(acme, "audit_staff"));
    const board = createTenantRepositories(db, sessionFor(acme, "board"));

    // CAE: full access.
    await expect(cae.kv.set("k", "v")).resolves.toBeUndefined();
    await expect(cae.settings.set("s", "v")).resolves.toBeUndefined();

    // Audit Staff: operational write yes, administrative (MANAGE) no.
    await expect(staff.kv.set("k2", "v")).resolves.toBeUndefined();
    await expect(staff.settings.set("s2", "v")).rejects.toBeInstanceOf(
      ForbiddenError,
    );

    // Board: reads only.
    expect(await board.kv.get("k")).toBe("v");
    expect(await board.settings.get("s")).toBe("v");
    await expect(board.kv.set("k3", "v")).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    await expect(board.settings.set("s3", "v")).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("a read-only Board user cannot mutate anything through any repository", async () => {
    const acme = contextOf(
      await registry.createTenant({ slug: "acme", name: "Acme" }),
    );
    const board = createTenantRepositories(db, sessionFor(acme, "board"));
    const cae = createTenantRepositories(db, sessionFor(acme, "cae"));

    await expect(board.kv.set("x", "1")).rejects.toBeInstanceOf(ForbiddenError);
    await expect(board.settings.set("x", "1")).rejects.toBeInstanceOf(
      ForbiddenError,
    );

    // Nothing was written by the forbidden attempts.
    expect(await cae.kv.get("x")).toBeNull();
    expect(await cae.settings.get("x")).toBeNull();
  });

  it("an authenticated user cannot act on a tenant other than their own", async () => {
    const alpha = contextOf(
      await registry.createTenant({ slug: "alpha-co", name: "Alpha Co" }),
    );
    await registry.createTenant({ slug: "beta-co", name: "Beta Co" });

    // Alpha's CAE writes a secret into alpha's schema.
    const alphaCae = createTenantRepositories(db, sessionFor(alpha, "cae"));
    await alphaCae.kv.set("secret", "alpha-only");

    // A user authenticates with a real signed token whose tenant claim is beta.
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const provider = new KeycloakIdentityProvider(publicKey, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    const token = await issueToken(privateKey, "beta-co", "cae");
    const betaSession = await authenticate(token, provider, registry);

    // Tenant is bound from the token, not anything the caller supplied.
    expect(betaSession.tenant.slug).toBe("beta-co");

    const betaRepos = createTenantRepositories(db, betaSession);
    // Cannot read alpha's data...
    expect(await betaRepos.kv.get("secret")).toBeNull();
    expect(await betaRepos.kv.all()).toEqual([]);

    // ...and writes land only in beta, invisible to alpha.
    await betaRepos.kv.set("beta-secret", "beta-only");
    expect(await alphaCae.kv.get("beta-secret")).toBeNull();
  });
});
