/**
 * Standing rules — security-critical invariants (Prompt 2).
 *
 * Asserts guarantees directly, independent of the Step 17 happy path.
 * Where enforcement is by discipline rather than construction, tests document
 * the gap instead of faking coverage.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { inspect } from "node:util";
import { LocalKms } from "@eqa/crypto";
import {
  ContentCatalog,
  ContentVersionImmutableError,
  loadContentPack,
} from "@eqa/content";
import { MissingTenantContextError } from "@eqa/tenant";
import {
  assertTransition,
  IllegalStatusTransitionError,
  type AssessmentResponseInput,
} from "@eqa/workflows";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clientFor, type Database } from "./database";
import { migrateShared } from "./migrate";
import { TenantRegistry } from "./registry";
import { createTenantRepositories } from "./repositories";
import { ScopedExecutor } from "./scoped/scoped-executor";
import { seedSeeraPilot } from "./seed";
import { contextOf, sessionFor } from "./testing/fixtures";
import { createInMemoryDatabase } from "./testing/in-memory";

const REPO_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);
const DEEP_IMPORT_FIXTURE_REL =
  "apps/web/__conformance-fixtures__/deep-import-violation.ts";
const CONTENT_FIXTURES = join(
  REPO_ROOT,
  "packages",
  "content",
  "src",
  "__fixtures__",
);
const WORKFLOWS_SRC = join(REPO_ROOT, "packages", "workflows", "src");
const DB_SCOPED = join(REPO_ROOT, "packages", "db", "src", "scoped");

const PIN: AssessmentResponseInput["pin"] = {
  contentPackId: "eqa-foundations",
  version: "1.0.0",
  contentHash: "a".repeat(64),
};

function kms(): LocalKms {
  return new LocalKms(randomBytes(32), "test-master");
}

function walkTsFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === "dist" || entry === ".next") {
        continue;
      }
      walkTsFiles(full, acc);
    } else if (entry.endsWith(".ts") && !entry.endsWith(".d.ts")) {
      acc.push(full);
    }
  }
  return acc;
}

describe("Standing rules — security-critical invariants", () => {
  describe("(a) repository query without tenant context fails", () => {
    let db: Database;

    beforeEach(() => {
      db = createInMemoryDatabase();
    });

    afterEach(async () => {
      await db.close();
    });

    it("rejects null/undefined session and invalid schema on ScopedExecutor", () => {
      expect(() => createTenantRepositories(db, null)).toThrow(
        MissingTenantContextError,
      );
      expect(() => createTenantRepositories(db, undefined)).toThrow(
        MissingTenantContextError,
      );
      expect(() => new ScopedExecutor(db, null)).toThrow(
        MissingTenantContextError,
      );
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
  });

  describe("(b) cross-tenant read throws or returns nothing", () => {
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

    it("returns empty/null for another tenant's data — never throws across schemas", async () => {
      const seera = await seedSeeraPilot(db, kms());
      const beta = await registry.createTenant({
        slug: "beta-co",
        name: "Beta Co",
      });

      const seeraRepos = createTenantRepositories(
        db,
        sessionFor(contextOf(seera)),
      );
      const betaRepos = createTenantRepositories(
        db,
        sessionFor(contextOf(beta)),
      );

      await seeraRepos.kv.set("conformance-secret", "seera-only");
      await seeraRepos.responses.submit({
        assessmentId: "assessment-seera-2026",
        questionId: "Q-1-1-1",
        answer: "4",
        pin: PIN,
      });

      expect(await betaRepos.kv.get("conformance-secret")).toBeNull();
      expect(await betaRepos.kv.all()).toEqual([]);
      expect(
        await betaRepos.responses.getForAssessment("assessment-seera-2026"),
      ).toEqual([]);
      expect(
        await betaRepos.draftFindings.getForAssessment("assessment-seera-2026"),
      ).toEqual([]);
    });
  });

  describe("(c) deep package import fails lint", () => {
    it("eslint boundaries/entry-point rejects reaching into package internals", () => {
      const result = spawnSync(
        "pnpm",
        ["exec", "eslint", "--no-ignore", DEEP_IMPORT_FIXTURE_REL],
        { cwd: REPO_ROOT, encoding: "utf8", shell: true },
      );
      const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
      expect(result.status).not.toBe(0);
      expect(output).toMatch(
        /boundaries\/entry-point|boundaries\/element-types/i,
      );
    });
  });

  describe("(d) createFinalConclusion has no public/AI caller path", () => {
    it("defines createFinalConclusion only inside human-review.ts (not exported)", () => {
      const humanReviewPath = join(WORKFLOWS_SRC, "human-review.ts");
      const indexSource = readFileSync(join(WORKFLOWS_SRC, "index.ts"), "utf8");

      const definers = walkTsFiles(WORKFLOWS_SRC)
        .filter((f) => !f.endsWith(".test.ts"))
        .filter((file) =>
          readFileSync(file, "utf8").includes("function createFinalConclusion"),
        );
      expect(definers).toEqual([humanReviewPath]);
      expect(indexSource).not.toMatch(/createFinalConclusion/);

      const productionSources = walkTsFiles(join(REPO_ROOT, "packages")).filter(
        (f) =>
          !f.endsWith(".test.ts") &&
          (f.includes("gap-flag") ||
            f.includes(`${join("packages", "ai", "src")}${""}`) ||
            f.includes("gap-flagging.ts")),
      );
      for (const file of productionSources) {
        const src = readFileSync(file, "utf8");
        expect(src).not.toContain("createFinalConclusion");
      }

      const gapFlagSystem = readFileSync(
        join(REPO_ROOT, "packages", "db", "src", "gap-flag-system.ts"),
        "utf8",
      );
      expect(gapFlagSystem).not.toContain("final_conclusions");
      expect(gapFlagSystem).not.toContain("resolveHumanReview");
    });

    it("allows read-mappers that rehydrate persisted rows (not promotion paths)", () => {
      const allowedReaders = new Set([
        "scoped/human-review-repository.ts",
        "mock-eqa-system.ts",
        "evidence-pack-system.ts",
      ]);
      const mappers = walkTsFiles(join(REPO_ROOT, "packages", "db", "src"))
        .filter((f) => !f.endsWith(".test.ts"))
        .filter((f) => !f.includes("standing-rules-conformance"))
        .filter((f) =>
          readFileSync(f, "utf8").includes('kind: "final_conclusion"'),
        );
      expect(mappers.length).toBeGreaterThan(0);
      for (const file of mappers) {
        const rel = relative(
          join(REPO_ROOT, "packages", "db", "src"),
          file,
        ).replace(/\\/g, "/");
        expect(allowedReaders.has(rel)).toBe(true);
      }
    });
  });

  describe("(e) mutating a used content version throws", () => {
    it("rejects in-place re-registration when a version is pinned in use", () => {
      const catalog = new ContentCatalog();
      const v1 = loadContentPack(join(CONTENT_FIXTURES, "ver-v1.json"));
      catalog.register(v1);
      catalog.pinForAssessment("assessment-conformance", "ver-demo", "1.0.0");

      const tampered = loadContentPack(
        join(CONTENT_FIXTURES, "ver-v1-modified.json"),
      );
      expect(() => catalog.register(tampered)).toThrow(
        ContentVersionImmutableError,
      );
      expect(catalog.isInUse("ver-demo", "1.0.0")).toBe(true);
    });
  });

  describe("(f) dismissed AI finding cannot transition to Closed", () => {
    it("forbids under_human_review → closed_ready (dismissed path is reviewed_no_gap only)", () => {
      expect(() =>
        assertTransition("under_human_review", "closed_ready"),
      ).toThrow(IllegalStatusTransitionError);
      expect(() => assertTransition("ai_flagged", "closed_ready")).toThrow(
        IllegalStatusTransitionError,
      );
      expect(() =>
        assertTransition("under_human_review", "reviewed_no_gap"),
      ).not.toThrow();
    });
  });

  describe("(g) plaintext data key is never logged, returned, or persisted", () => {
    let db: Database;

    beforeEach(() => {
      db = createInMemoryDatabase();
    });

    afterEach(async () => {
      await db.close();
    });

    it("persists only wrapped ciphertext and redacts KMS serialization", async () => {
      const localKms = kms();
      const registry = new TenantRegistry(db, localKms);
      await migrateShared(db);

      await registry.createTenant({ slug: "key-test-co", name: "Key Test Co" });

      const { rows } = await clientFor(db).query<{
        data_key_ciphertext: string;
      }>(`SELECT data_key_ciphertext FROM platform.tenants WHERE slug = $1`, [
        "key-test-co",
      ]);
      const stored = rows[0]?.data_key_ciphertext ?? "";

      expect(stored.length).toBeGreaterThan(40);
      expect(Buffer.from(stored, "base64").length).toBeGreaterThan(32);

      const encrypted = await registry.getEncryptedDataKey("key-test-co");
      expect(encrypted.ciphertext).toBe(stored);
      expect(encrypted.masterKeyId).toBe("test-master");

      const roundTrip = await localKms.decryptDataKey(encrypted);
      expect(roundTrip.length).toBe(32);
      expect(stored).not.toBe(roundTrip.toString("base64"));
      expect(stored.toLowerCase()).not.toContain(roundTrip.toString("hex"));

      const serialized = JSON.stringify(encrypted);
      const inspected = inspect(localKms);
      expect(serialized).not.toContain(roundTrip.toString("base64"));
      expect(serialized).not.toContain(roundTrip.toString("hex"));
      expect(inspected).not.toContain(roundTrip.toString("base64"));
      expect(inspected).toMatch(/REDACTED/i);
    });
  });

  describe("(h) mutating repository methods write audit entries", () => {
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

    async function auditCount(
      repos: ReturnType<typeof createTenantRepositories>,
    ): Promise<number> {
      return (await repos.audit.list()).length;
    }

    it("recordWrite-backed mutations append hash-chained audit rows", async () => {
      const tenant = await registry.createTenant({
        slug: "audit-co",
        name: "Audit Co",
      });
      const repos = createTenantRepositories(db, sessionFor(contextOf(tenant)));
      const baseline = await auditCount(repos);

      await repos.kv.set("rule-h", "value");
      expect(await auditCount(repos)).toBe(baseline + 1);
      expect((await repos.audit.list()).at(-1)?.entity).toBe("tenant_kv");

      await repos.responses.submit({
        assessmentId: "assessment-1",
        questionId: "Q-1-1-1",
        answer: "3",
        pin: PIN,
      });
      expect(await auditCount(repos)).toBe(baseline + 2);
      expect((await repos.audit.list()).at(-1)?.entity).toBe(
        "assessment_response",
      );

      await repos.itemStatus.transition({
        assessmentId: "assessment-1",
        questionId: "Q-1-1-1",
        to: "evidence_requested",
      });
      expect(await auditCount(repos)).toBe(baseline + 3);
      expect((await repos.audit.list()).at(-1)?.entity).toBe(
        "assessment_item_status",
      );

      expect((await repos.audit.verify()).valid).toBe(true);
    });

    /**
     * GAP (by discipline, not recordWrite): remediation.markReadyForRetest /
     * recordRetestPass / recordRetestFail update remediation_items via raw SQL
     * inside transitionRemediation without recordWrite. Item-status transitions
     * within those methods ARE audited. This test documents the gap — it does
     * not assert remediation_item audit rows for retest transitions.
     */
    it("documents remediation retest transitions audit status only (discipline gap)", async () => {
      const tenant = await registry.createTenant({
        slug: "rem-gap-co",
        name: "Rem Gap",
      });
      const repos = createTenantRepositories(db, sessionFor(contextOf(tenant)));
      const q = "Q-1-2-1";

      for (const to of [
        "evidence_requested",
        "evidence_submitted",
        "ai_flagged",
        "under_human_review",
        "gap_confirmed",
      ] as const) {
        await repos.itemStatus.transition({
          assessmentId: "assessment-1",
          questionId: q,
          to,
        });
      }

      const before = await auditCount(repos);
      const item = await repos.remediation.assign({
        assessmentId: "assessment-1",
        questionId: q,
        standardNumber: "1.2",
        action: "Fix gap",
        owner: "Owner",
        targetDate: "2026-12-31",
      });
      const afterAssign = await auditCount(repos);
      expect(afterAssign).toBeGreaterThan(before);
      expect(
        (await repos.audit.list()).some((e) => e.entity === "remediation_item"),
      ).toBe(true);

      const beforeRetest = await auditCount(repos);
      await repos.remediation.markReadyForRetest(item.remediationId);
      const afterRetest = await auditCount(repos);
      expect(afterRetest).toBeGreaterThan(beforeRetest);
      expect(
        (await repos.audit.list())
          .slice(beforeRetest)
          .every((e) => e.entity !== "remediation_item"),
      ).toBe(true);
      expect(
        (await repos.audit.list())
          .slice(beforeRetest)
          .some((e) => e.entity === "assessment_item_status"),
      ).toBe(true);
    });

    it("documents job-enqueue repositories defer persistence audit to job handlers", () => {
      const mockEqaSrc = readFileSync(
        join(DB_SCOPED, "mock-eqa-repository.ts"),
        "utf8",
      );
      const packSrc = readFileSync(
        join(DB_SCOPED, "evidence-pack-repository.ts"),
        "utf8",
      );
      expect(mockEqaSrc).not.toContain("recordWrite");
      expect(packSrc).not.toContain("recordWrite");
      expect(mockEqaSrc).toContain("queue.enqueue");
      expect(packSrc).toContain("queue.enqueue");
    });

    it("human-review applyReview writes via audit.append directly (constructed, not recordWrite)", () => {
      const src = readFileSync(
        join(DB_SCOPED, "human-review-repository.ts"),
        "utf8",
      );
      expect(src).toContain("this.audit.append");
      expect(src).not.toContain("recordWrite");
    });
  });
});
