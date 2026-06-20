# Step 17 — Seera-pilot integration pass

**Branch:** `step-17-integration` (based on `plan-b` / Step 16)  
**Test:** `packages/db/src/seera-pilot-integration.test.ts`  
**Companion:** `packages/db/src/standing-rules-conformance.test.ts` (negative paths not duplicated in the happy-path walk)

Synthetic data only (rule 5). Two tenants: **Seera-pilot** (full loop) and **beta-co** (decoy; operations interleaved to exercise isolation).

---

## Assertion → standing rule map

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

---

## Rules not exercised by this pass

These remain **Phase 5 / infra / discipline** items—documented here so gate visibility is explicit:

| Rule | Gap |
| --- | --- |
| **2** Data residency (no client data leaves KSA) | Integration uses `LocalStubModelAdapter` (`adapterLocation: local`). No network egress assertion; production requires in-Kingdom adapter + infra controls. |
| **6** Build-verify cadence | Process rule, not a runtime assertion. |
| **13** Encrypted backups + restore testing | Infra checklist (`docs/INFRA-ENCRYPTION-CHECKLIST.md`); no backup/restore in this test. |
| Real **KMS/HSM** master key | Tests use `LocalKms` dev stub (rule 8 ciphertext shape only). |
| **No external AI network path** | Stub adapter only; external adapter rejection covered in `@eqa/ai` unit tests, not this E2E walk. |
| Deep **package boundary** lint | Covered in `standing-rules-conformance.test.ts` (c), not duplicated in Step 17 walk. |
| `createFinalConclusion` static caller graph | Covered in `standing-rules-conformance.test.ts` (d). |
| Remediation retest row-level audit gap | Documented in `standing-rules-conformance.test.ts` (h) — status transitions audited, some remediation SQL paths are discipline-only. |

---

## Full gate (run on `step-17-integration`)

```bash
pnpm type-check
pnpm lint
pnpm test
```

Expected: integration test + standing-rules suite green; Step 16 visual/determinism tests unchanged.
