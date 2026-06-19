import { randomBytes } from "node:crypto";
import { ForbiddenError } from "@eqa/auth";
import { LocalKms } from "@eqa/crypto";
import type { TenantDescriptor } from "@eqa/tenant";
import type { AssessmentResponseInput } from "@eqa/workflows";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Database } from "./database";
import { migrateShared } from "./migrate";
import { TenantRegistry } from "./registry";
import { createTenantRepositories } from "./repositories";
import { contextOf, sessionFor } from "./testing/fixtures";
import { createInMemoryDatabase } from "./testing/in-memory";

function kms(): LocalKms {
  return new LocalKms(randomBytes(32), "test-master");
}

const PIN: AssessmentResponseInput["pin"] = {
  contentPackId: "eqa-foundations",
  version: "1.0.0",
  contentHash: "a".repeat(64),
};

function response(
  overrides: Partial<AssessmentResponseInput> = {},
): AssessmentResponseInput {
  return {
    assessmentId: "assessment-1",
    questionId: "Q-1-1-1",
    answer: "3",
    pin: PIN,
    ...overrides,
  };
}

describe("TenantResponseRepository", () => {
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

  async function tenant(slug: string): Promise<TenantDescriptor> {
    return registry.createTenant({ slug, name: slug });
  }

  it("persists a response with its content pin, scoped to the tenant", async () => {
    const acme = await tenant("acme-co");
    const repos = createTenantRepositories(
      db,
      sessionFor(contextOf(acme), "cae"),
    );

    await repos.responses.submit(response({ note: "synthetic" }));

    const all = await repos.responses.getForAssessment("assessment-1");
    expect(all).toHaveLength(1);
    const saved = all[0];
    expect(saved?.questionId).toBe("Q-1-1-1");
    expect(saved?.answer).toBe("3");
    expect(saved?.note).toBe("synthetic");
    expect(saved?.pin).toEqual(PIN);
    expect(saved?.respondedBy).toBe(`user-acme-co-cae`);
    expect(typeof saved?.respondedAt).toBe("string");
  });

  it("allows Audit Staff to answer", async () => {
    const acme = await tenant("acme-co");
    const repos = createTenantRepositories(
      db,
      sessionFor(contextOf(acme), "audit_staff"),
    );
    await expect(repos.responses.submit(response())).resolves.toBeUndefined();
  });

  it("forbids a read-only Board/Audit Committee user from answering", async () => {
    const acme = await tenant("acme-co");
    const board = createTenantRepositories(
      db,
      sessionFor(contextOf(acme), "board"),
    );

    await expect(board.responses.submit(response())).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    // …but a Board user can still read.
    await expect(
      board.responses.getForAssessment("assessment-1"),
    ).resolves.toEqual([]);
  });

  it("produces an audit entry automatically for each response", async () => {
    const acme = await tenant("acme-co");
    const repos = createTenantRepositories(
      db,
      sessionFor(contextOf(acme), "cae"),
    );

    await repos.responses.submit(response());

    const entries = await repos.audit.list();
    const entry = entries.find((e) => e.entity === "assessment_response");
    expect(entry).toBeDefined();
    expect(entry?.action).toBe("create");
    expect(entry?.actorRole).toBe("cae");
    expect(entry?.entityId).toBe("assessment-1::Q-1-1-1");
    expect((await repos.audit.verify()).valid).toBe(true);
  });

  it("isolates responses per tenant", async () => {
    const acme = await tenant("acme-co");
    const beta = await tenant("beta-co");

    const acmeRepos = createTenantRepositories(
      db,
      sessionFor(contextOf(acme), "cae"),
    );
    const betaRepos = createTenantRepositories(
      db,
      sessionFor(contextOf(beta), "cae"),
    );

    await acmeRepos.responses.submit(response());

    expect(
      await acmeRepos.responses.getForAssessment("assessment-1"),
    ).toHaveLength(1);
    expect(await betaRepos.responses.getForAssessment("assessment-1")).toEqual(
      [],
    );
  });

  it("upserts the latest answer for a question (one current row)", async () => {
    const acme = await tenant("acme-co");
    const repos = createTenantRepositories(
      db,
      sessionFor(contextOf(acme), "cae"),
    );

    await repos.responses.submit(response({ answer: "1" }));
    await repos.responses.submit(response({ answer: "3" }));

    const all = await repos.responses.getForAssessment("assessment-1");
    expect(all).toHaveLength(1);
    expect(all[0]?.answer).toBe("3");

    // The update is audited as an update on top of the create.
    const entries = await repos.audit.list();
    const responseEntries = entries.filter(
      (e) => e.entity === "assessment_response",
    );
    expect(responseEntries.map((e) => e.action)).toEqual(["create", "update"]);
  });
});
