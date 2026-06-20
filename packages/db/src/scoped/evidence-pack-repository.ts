import { type AuthSession, authorize, PERMISSIONS } from "@eqa/auth";
import type { JobQueue } from "@eqa/jobs";
import type { ObjectStore } from "@eqa/storage";
import {
  EVIDENCE_PACK_EXPORT_JOB,
  type EvidencePackExportPayload,
  type EvidencePackManifest,
} from "@eqa/workflows";
import { readLatestEvidencePackExport } from "../evidence-pack-system";
import { AuditedRepository } from "./audited-repository";
import type { ScopedExecutor } from "./scoped-executor";

export interface RequestEvidencePackExportInput {
  readonly assessmentId: string;
  readonly contentPackId: string;
  readonly contentVersion: string;
  readonly locale?: "en" | "ar";
}

export interface EvidencePackExportSummary {
  readonly exportId: string;
  readonly manifest: EvidencePackManifest;
  readonly objectKey: string;
  readonly fileName: string;
  readonly sizeBytes: number;
}

/**
 * Tenant-scoped evidence pack export store. WRITE (CAE / Audit Staff) enqueues
 * the Step 6.5 background job; READ (including Board) retrieves exports.
 * Board cannot request a new generation.
 */
export class TenantEvidencePackRepository extends AuditedRepository {
  constructor(
    exec: ScopedExecutor,
    session: AuthSession,
    private readonly queue: JobQueue | undefined,
    private readonly objectStore: ObjectStore | undefined,
  ) {
    super(exec, session);
  }

  async requestExport(
    input: RequestEvidencePackExportInput,
  ): Promise<{ jobId: string }> {
    authorize(this.session, PERMISSIONS.WRITE);
    if (!this.queue) {
      throw new Error("Job queue is not configured for evidence pack export.");
    }

    const payload: EvidencePackExportPayload = {
      assessmentId: input.assessmentId,
      contentPackId: input.contentPackId,
      contentVersion: input.contentVersion,
      requestedBy: this.session.userId,
      includeRawEvidence: false,
      ...(input.locale === undefined ? {} : { locale: input.locale }),
    };

    const handle = await this.queue.enqueue({
      name: EVIDENCE_PACK_EXPORT_JOB,
      tenant: this.session.tenant,
      payload,
    });

    return { jobId: handle.id };
  }

  async getLatest(
    assessmentId: string,
  ): Promise<EvidencePackExportSummary | null> {
    authorize(this.session, PERMISSIONS.READ);
    return readLatestEvidencePackExport(this.exec, assessmentId);
  }

  async readPdfBytes(objectKey: string): Promise<Buffer | null> {
    authorize(this.session, PERMISSIONS.READ);
    if (!this.objectStore) return null;
    const bytes = await this.objectStore.get(objectKey);
    return bytes ? Buffer.from(bytes) : null;
  }
}
