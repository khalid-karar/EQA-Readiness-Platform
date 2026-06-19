import type { AuthSession } from "@eqa/auth";
import type { TenantCipher } from "@eqa/crypto";
import { MissingTenantContextError } from "@eqa/tenant";
import type { Database } from "./database";
import { TenantAuditReader } from "./scoped/audit-reader";
import { TenantDraftFindingRepository } from "./scoped/draft-finding-repository";
import { TenantEvidenceRepository } from "./scoped/evidence-repository";
import { TenantHumanReviewRepository } from "./scoped/human-review-repository";
import { TenantItemStatusRepository } from "./scoped/item-status-repository";
import { TenantKvRepository } from "./scoped/kv-repository";
import { TenantRemediationRepository } from "./scoped/remediation-repository";
import { TenantResponseRepository } from "./scoped/response-repository";
import { ScopedExecutor } from "./scoped/scoped-executor";
import { TenantSecureRepository } from "./scoped/secure-repository";
import { TenantSettingsRepository } from "./scoped/settings-repository";
import { TenantWorkingPaperReviewRepository } from "./scoped/working-paper-review-repository";

/**
 * The tenant-scoped repositories available to feature code. This is the ONLY
 * sanctioned way feature code touches tenant data. Every method enforces both
 * tenant scoping (via the schema bound to the session's tenant) and RBAC (via
 * the session's role), and every mutation is audited automatically.
 */
export interface TenantRepositories {
  readonly kv: TenantKvRepository;
  readonly settings: TenantSettingsRepository;
  /** Questionnaire responses (the workflow engine's response store). */
  readonly responses: TenantResponseRepository;
  /** Per-item status with state-machine-enforced, audited transitions. */
  readonly itemStatus: TenantItemStatusRepository;
  /** Read-only access to AI-drafted gap findings (always draft work product). */
  readonly draftFindings: TenantDraftFindingRepository;
  /** Human reviewer workflow — the only path to a final conclusion. */
  readonly humanReview: TenantHumanReviewRepository;
  /** Evidence file metadata (the storage layer's evidence store). */
  readonly evidence: TenantEvidenceRepository;
  /** Working-paper review entities (engagement → file → paper → checklist). */
  readonly workingPaperReview: TenantWorkingPaperReviewRepository;
  /** Remediation tracker for confirmed gaps. */
  readonly remediation: TenantRemediationRepository;
  /** Read-only access to the tenant's immutable, hash-chained audit log. */
  readonly audit: TenantAuditReader;
  /**
   * Encrypted-at-rest sensitive fields. Only present when a per-tenant cipher
   * is supplied (see {@link RepositoryOptions.cipher}).
   */
  readonly secure?: TenantSecureRepository;
}

export interface RepositoryOptions {
  /**
   * A cipher bound to the acting tenant's data key, enabling the `secure`
   * repository for application-level field encryption.
   */
  readonly cipher?: TenantCipher;
}

/**
 * Creates the repository set for an authenticated session.
 *
 * The schema is taken from `session.tenant` (bound from the token at
 * authentication), so a request cannot select another tenant. A missing session
 * or invalid tenant context throws — data access without context is impossible.
 */
export function createTenantRepositories(
  db: Database,
  session: AuthSession | null | undefined,
  options?: RepositoryOptions,
): TenantRepositories {
  if (!session) {
    throw new MissingTenantContextError(
      "Data access requires an authenticated session.",
    );
  }
  const exec = new ScopedExecutor(db, session.tenant);
  const repositories: {
    kv: TenantKvRepository;
    settings: TenantSettingsRepository;
    responses: TenantResponseRepository;
    itemStatus: TenantItemStatusRepository;
    draftFindings: TenantDraftFindingRepository;
    humanReview: TenantHumanReviewRepository;
    evidence: TenantEvidenceRepository;
    workingPaperReview: TenantWorkingPaperReviewRepository;
    remediation: TenantRemediationRepository;
    audit: TenantAuditReader;
    secure?: TenantSecureRepository;
  } = {
    kv: new TenantKvRepository(exec, session),
    settings: new TenantSettingsRepository(exec, session),
    responses: new TenantResponseRepository(exec, session),
    itemStatus: new TenantItemStatusRepository(exec, session),
    draftFindings: new TenantDraftFindingRepository(exec, session),
    humanReview: new TenantHumanReviewRepository(exec, session),
    evidence: new TenantEvidenceRepository(exec, session),
    workingPaperReview: new TenantWorkingPaperReviewRepository(exec, session),
    remediation: new TenantRemediationRepository(exec, session),
    audit: new TenantAuditReader(exec, session),
  };
  if (options?.cipher) {
    repositories.secure = new TenantSecureRepository(
      exec,
      session,
      options.cipher,
    );
  }
  return repositories;
}
