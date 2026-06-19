# INFRA-ENCRYPTION CHECKLIST (Phase 5 — Deployment)

These items are **cloud/infrastructure configuration, not application code.** They
must be verified at deployment time and **before any real client data is
onboarded.** The application already enforces tenant isolation, envelope
encryption of per-tenant data keys, application-level field encryption, and a
hash-chained audit log; this checklist covers the platform underneath it.

All resources must be provisioned in the approved **Saudi Arabia region** — no
data, backup, key material, or log may leave KSA.

---

## 1. Database encryption at rest

- [ ] PostgreSQL storage volumes are encrypted at rest (e.g. cloud-managed
      encrypted block storage / TDE), using a KMS-managed key in the KSA region.
- [ ] The encryption key is customer/tenant-platform managed (CMK), not only a
      provider-default key, and key rotation is enabled.
- [ ] Read replicas, snapshots, and temporary/scratch storage are encrypted with
      the same standard.
- [ ] Confirm `data_key_ciphertext` columns hold only wrapped keys (verified in
      app tests) — DB-at-rest encryption is the second layer, not the only one.

## 2. Object / blob storage encryption

- [ ] Evidence and document object storage (buckets/containers) enforce
      server-side encryption at rest with a KSA-region KMS key.
- [ ] Bucket policy **denies unencrypted uploads** and denies public access.
- [ ] Enforce TLS-only access (deny non-HTTPS requests) via bucket/container
      policy.
- [ ] Object versioning + lifecycle retention configured for quarantine/scan
      workflow (ties into the later file-handling phase).

## 3. Backup encryption & restore testing

- [ ] Automated backups (DB + object storage) are encrypted at rest with a
      KSA-region key.
- [ ] Backups are stored only in the KSA region (no cross-region replication out
      of country).
- [ ] **Restore is tested and verified** — a restored copy boots, passes
      `/health`, and the audit hash chain still verifies (`audit.verify()`).
- [ ] Backup access is least-privilege and audited; backup deletion requires
      elevated approval.
- [ ] Documented RPO/RTO and a tested runbook for restore.

## 4. TLS 1.3 termination

- [ ] All public endpoints terminate TLS **1.3** (1.2 only as a temporary,
      documented fallback; older protocols disabled).
- [ ] Strong cipher suites only; HSTS enabled.
- [ ] Certificates managed and auto-rotated; private keys stored in the secrets
      manager / HSM, never in the repo or images.
- [ ] Internal service-to-service traffic (app ↔ DB, app ↔ object storage, app ↔
      Keycloak) is encrypted in transit.

## 5. Secrets-manager configuration

- [ ] The KMS **master key** (envelope-encryption root) lives in a managed
      KMS/HSM in the KSA region — never in env files, images, or the repo. The
      local `LocalKms` stub is for development only.
- [ ] Application secrets (DB credentials, Keycloak client secrets, KMS key
      references) are stored in a managed secrets manager and injected at
      runtime; `.env` is git-ignored and only `.env.example` is committed.
- [ ] Access to secrets and the master key is least-privilege (per-service
      identity) and fully audited.
- [ ] Key rotation policy defined for the master key and tenant data keys, with
      a documented re-wrap procedure.
- [ ] CI secret scanning (gitleaks) remains green; no secret material is ever
      committed.

---

### Sign-off

- [ ] All items above verified in the target environment.
- [ ] Verified by: **\_\_\_\_** Date: **\_\_\_\_**
- [ ] Approved for real-client onboarding by: **\_\_\_\_** Date: **\_\_\_\_**
