# Step 17 — Real-Services E2E Integration Report

**Branch:** `step-17-e2e-harness`
**Real-DB isolation test:** `apps/web/e2e/tenant-isolation.spec.ts`
**Config:** `apps/web/playwright.realdb.config.ts` (port 3100, demo fixtures OFF)
**Run:** `pnpm --filter @eqa/web test:e2e:realdb`

Synthetic data only (rule 5). Two tenants: **seera-pilot** (full demo seed) and **beta-co** (minimal, distinguishable seed) — each in its own Postgres schema.

---

## 1. What the real-DB e2e walks, and which real services it hits

The default Playwright suite (`playwright.config.ts`) runs the journey/screenshot specs against **in-memory synthetic fixtures** (`EQA_UI_DEMO_FIXTURES=true`). Those tests never touch Postgres, so a tenant-isolation test built on them would be hollow.

The real-DB suite removes that fixture flag. With `DATABASE_URL` present (from `.env.local`) and `isDemoFixturesEnabled()` returning false, the dashboard server-renders from **real tenant-scoped Postgres reads**.

Services exercised by `test:e2e:realdb`:

| Service | Role in this test | Real? |
| --- | --- | --- |
| **Auth identity provider** | `EQA_E2E_TEST_AUTH=true` selects the static test JWKS provider (`resolveIdentityProvider`). Cookies minted by `buildE2eSessionCookie("cae", <tenant>)` carry a signed JWT whose `tenant` claim is verified by the same `authenticate()` path production uses. | Real verification path; test signing keys (stands in for Keycloak). |
| **Tenant directory / gate** | `getTenantDirectory()` resolves the token's `tenant` claim against `TENANT_ALLOWLIST="seera-pilot,beta-co"`; `tenantSchemaName(slug)` derives the schema. | Real (production code path). |
| **Postgres (schema-per-tenant)** | The dashboard loader reads `assessment_item_status`, `draft_findings`, human-review conclusions, and working-paper conformance from the acting tenant's schema via `ScopedExecutor`. | Real Postgres. |
| **KMS** | `LocalKms` from `KMS_MASTER_KEY` (`.env.local`) unwraps each tenant's data key during seeding/reads. | Dev KMS stub (ciphertext shape only). |
| **Ollama / AI adapter** | Not required. The AI drafts read on the dashboard were produced at **seed** time by the local stub adapter; the test asserts persisted rows, not live inference. | Not hit. |
| **Object store / ClamAV** | Not required for the dashboard markers. | Not hit. |

Auth note: `get-server-session.ts`, `middleware.ts`, and `oidc.ts` were **not** modified. `EQA_E2E_TEST_AUTH` now governs only the identity provider; it no longer implies demo fixtures (`apps/web/lib/demo-fixtures.ts`).

---

## 2. Tenant-isolation design (seera-pilot vs beta-co)

The dashboard never renders a per-tenant title from the DB — the assessment name is a UI constant for both tenants — so the markers are **DB-sourced row data** surfaced on `/dashboard` through the "What's Next" panel (`buildPendingActions` in `packages/workflows/src/readiness-dashboard.ts`, rendered by `WhatsNextPanel`).

| Tenant | Seeded row (its schema only) | Rendered marker on `/dashboard` |
| --- | --- | --- |
| **seera-pilot** | A `draft_findings` row (COI declarations, AI-flagged, never human-reviewed) → `pendingReviewCount > 0`. Seeded by `seedSeeraPilotDemoData`. | `AI draft finding(s) pending review` |
| **beta-co** | One `assessment_item_status` row left in `evidence_requested`. Seeded by `seedBetaCoDemoData`. | `standard(s) need evidence` |

**Why the beta marker can only come from beta-co's schema (teeth):**
- The seera-pilot demo seed leaves **no** item in `evidence_requested` (every submitted item advances to `evidence_submitted` or beyond; one is `not_applicable`), so seera never renders `standard(s) need evidence`.
- The in-memory demo fixtures always return seera-shaped data and likewise never produce `evidence_requested`.
- Therefore `standard(s) need evidence` can render **only** if the request read beta-co's own Postgres schema. If the server were on fixtures, or if beta-co's slug resolved to the wrong schema, the beta-co assertion fails.

Both tests assert presence of the tenant's own marker **and** `toHaveCount(0)` for the other tenant's marker — absence is checked in both directions. The beta-co test also asserts HTTP `200` (loads, not an error/forbidden page).

---

## 3. Mutation proof (does the test have teeth?)

A single temporary line in `packages/tenant/src/schema.ts` forced all slugs to resolve to seera's schema (kept reachable so the build would not fail for an unrelated reason):

```diff
-  return schema;
+  return "tenant_seera_pilot"; // MUTATION-TEST: force all tenants to seera schema (revert me)
```

Run: `taskkill /F /IM node.exe ; pnpm --filter @eqa/web test:e2e:realdb`

```
  ok 1 › seera-pilot dashboard shows seera data, not beta-co data (4.5s)
  x  2 › beta-co dashboard loads and shows beta data, not seera data (6.6s)
     Error: expect(locator).toBeVisible() failed
     Locator: getByText(/standard\(s\) need evidence/i).first()
     Expected: visible — element(s) not found
  1 failed
  1 passed (1.4m)
```

- **beta-co went RED** at exactly the broken assertion: forced onto seera's schema, beta's `standard(s) need evidence` marker is absent.
- **seera-pilot stayed GREEN** (seera still maps to its own schema).

**Clean revert:** restored `return schema;`; `git diff -- packages/tenant/src/schema.ts` is empty and the working tree is clean.

**Re-green after revert:**

```
  ok 1 › seera-pilot dashboard shows seera data, not beta-co data (4.6s)
  ok 2 › beta-co dashboard loads and shows beta data, not seera data (1.9s)
  2 passed (1.3m)
```

The test fails when cross-tenant scoping breaks and passes when it is restored — it has teeth.

---

## 4. Coverage reasoning

Tenant isolation is enforced at a **single chokepoint** that every screen read flows through:

```
token `tenant` claim
  → getTenantDirectory() / authenticate()        (bind tenant from token, never headers)
    → tenantSchemaName(slug)                      (derive schema)
      → ScopedExecutor(db, tenantContext)         (qualifies EVERY table as "schema".table)
        → all TenantRepositories reads/writes
```

`ScopedExecutor` qualifies all SQL with the tenant's schema and refuses to construct without a valid tenant context — it does not rely on a session `search_path`. All UI loaders (dashboard, assessment, evidence, findings, working-papers, remediation, mock-EQA, evidence-pack) obtain their repositories from `uiRepositories(db, assertUiSession(session))`, i.e. the same `ScopedExecutor` binding.

- **Explicitly asserted:** `/dashboard` for both tenants, both directions (presence of own DB marker + absence of the other's), beta-co HTTP 200.
- **Covered-by-mechanism:** the other authenticated screens read through the identical `tenantSchemaName → ScopedExecutor` path, so the mutation that broke the dashboard would break them too. The mutation proof demonstrates the chokepoint is load-bearing, not the per-screen wiring of each route.

---

## 5. Honest gaps (NOT covered by this sub-step)

- **Only `/dashboard` is asserted directly.** Other screens (assessment, evidence, findings, working-papers, remediation, mock-EQA, evidence-pack) are covered only by shared mechanism, not by their own isolation assertions. Step 17 follow-up item 1 (full-loop beta-co interleave) addresses this.
- **No write-path isolation asserted in the browser e2e.** Cross-tenant write rejection is covered by `packages/db` unit/integration tests (pg-mem), not by this Postgres browser test.
- **AI / Ollama, object store, ClamAV not hit** by the real-DB e2e — those paths are exercised at seed time and in package tests, not live here.
- **Keycloak is stubbed** by the static test provider; this validates the verification + tenant-binding code path, not a live Keycloak round-trip.
- **KMS is `LocalKms`** (dev stub), not a real HSM/KMS.
- **Arabic/RTL not re-verified** in the real-DB test (markers are EN). RTL rendering remains covered by the fixture journey's AR run.
- **Data residency (rule 2), encrypted backups (rule 13)** remain Phase 5 / infra items, unchanged by this sub-step.

---

## Companion: in-memory integration walk (assertion → standing-rule map)

The following table documents the broader pg-mem integration walk
(`packages/db/src/seera-pilot-integration.test.ts` +
`packages/db/src/standing-rules-conformance.test.ts`), retained here for full
Step 17 rule coverage. These run under `pnpm test` (not the browser e2e).

| Integration assertion | Rule(s) |
| --- | --- |
| `seedSeeraPilot` + `SEERA_PILOT` slug; decoy `beta-co`; no real client data | **5** Synthetic data only |
| `createTenantRepositories(db, null \| undefined)` throws `MissingTenantContextError` | **7** Tenant-scoped data access only |
| All reads/writes via `reposFor(seera)` / `ScopedExecutor` (implicit throughout) | **7** |
| Wrapped `data_key_ciphertext` only; plaintext key not in JSON/`inspect(kms)` | **8** Envelope encryption |
| Illegal `itemStatus.transition` rejected; `assertTransition(under_human_review → closed_ready)` throws | **8** State machine at data layer |
| Pending review item (`Q_PENDING`) cannot jump `under_human_review → closed_ready` | **8**, **12** (dismiss/review path) |
| Rejected AI finding: no `final_conclusion` row; status `reviewed_no_gap` | **12** Human-in-the-loop |
| Accept / edit-accept produce finals only after `HumanReviewEngine.review`; `human_review_decision` audited | **12** |
| AI drafts: `draft` status, full provenance (prompt/rubric/adapter/input/output/timestamp), content pin | **12** |
| Gap-flag / scan / mock-EQA / evidence-pack jobs via `InMemoryJobQueue` + `queue.onIdle()` | **10** Background jobs |
| Evidence upload `quarantined`; download URL rejected until scan; clean after `MALWARE_SCAN_JOB` | **9** File safety gate |
| Responses carry exact `contentHash` + `version`; pinned version immutable once registered | **3**, **11** |
| `ContentCatalog.register(tamperedPack)` throws after `pinForAssessment` | **11** |
| `assertDecoyTenantIsolated` at multiple stages (responses, evidence, AI, review, final) | **1** Multi-tenant isolation |
| Decoy KV write invisible to Seera; Seera data invisible to decoy | **1** |
| Per-tenant object keys (`tenant_seera_pilot` vs `tenant_beta_co`) | **1**, **8** |
| Hash-chained audit `verify().valid`; job + human-review entities present | **4** Foundational audit |
| Schema-per-tenant via registry + `TenantCipher` per tenant | **1**, **8** |
| Mock-EQA `kind === readiness_simulation`; `assertFormalAssessmentResult` throws | **12** (simulation ≠ formal result) |
| Evidence pack: `bundledFileCount === 0`, no raw bytes in PDF, disclaimer + compliance markers | **12**, **9** (references not raw files) |
| Seera demo spans principles 1–2, pending review, remediation retest fail, WP unreviewed rollup | **5** (rich synthetic, non-trivial) |

### Rules not exercised (Phase 5 / infra / discipline)

| Rule | Gap |
| --- | --- |
| **2** Data residency (no client data leaves KSA) | `LocalStubModelAdapter` (`adapterLocation: local`); no egress assertion. Production requires in-Kingdom adapter + infra controls. |
| **6** Build-verify cadence | Process rule, not a runtime assertion. |
| **13** Encrypted backups + restore testing | Infra checklist (`docs/INFRA-ENCRYPTION-CHECKLIST.md`); no backup/restore in tests. |
| Real **KMS/HSM** master key | Tests use `LocalKms` dev stub (rule 8 ciphertext shape only). |
| **No external AI network path** | Stub adapter only; external rejection covered in `@eqa/ai` unit tests. |
| Deep **package boundary** lint | Covered in `standing-rules-conformance.test.ts`. |
| `createFinalConclusion` static caller graph | Covered in `standing-rules-conformance.test.ts`. |

---

## Full gate

```bash
taskkill /F /IM node.exe
pnpm type-check
pnpm lint
pnpm test
```

Real-DB isolation suite (separate, needs Docker Postgres + seeded tenants):

```bash
pnpm --filter @eqa/db seed
pnpm --filter @eqa/web test:e2e:realdb
```
