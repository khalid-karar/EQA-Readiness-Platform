import { type AuthSession, authorize, PERMISSIONS } from "@eqa/auth";
import type {
  DownloadGrant,
  EvidenceMetadata,
  EvidenceScanStatus,
  EvidenceStore,
  NewEvidenceVersion,
} from "@eqa/storage";
import type { Row } from "../sql-client";
import { AuditedRepository } from "./audited-repository";
import type { ScopedExecutor } from "./scoped-executor";

interface EvidenceRow extends Row {
  evidence_id: string;
  version: number | string;
  version_hash: string;
  content_hash: string;
  file_name: string;
  content_type: string;
  size_bytes: number | string;
  links: string;
  scan_status: string;
  scanner: string | null;
  object_key: string;
  uploaded_by: string;
  uploaded_at: string;
}

function entityId(evidenceId: string, version: number): string {
  return `${evidenceId}:v${version}`;
}

function toMetadata(row: EvidenceRow): EvidenceMetadata {
  return {
    evidenceId: row.evidence_id,
    version: Number(row.version),
    versionHash: row.version_hash,
    contentHash: row.content_hash,
    fileName: row.file_name,
    contentType: row.content_type,
    sizeBytes: Number(row.size_bytes),
    links: JSON.parse(row.links) as string[],
    scanStatus: row.scan_status as EvidenceScanStatus,
    scanner: row.scanner,
    objectKey: row.object_key,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at,
  };
}

const COLUMNS = `evidence_id, version, version_hash, content_hash, file_name,
  content_type, size_bytes, links, scan_status, scanner, object_key,
  uploaded_by, uploaded_at`;

/**
 * Tenant-scoped store for evidence metadata, implementing the storage layer's
 * {@link EvidenceStore} port. Uploads require WRITE (CAE/Audit Staff; Board is
 * read-only and cannot upload); reads and download grants require READ. Every
 * write — including the audit-logged download grant — flows through the
 * tenant-isolated, hash-chained audit path via {@link AuditedRepository}.
 */
export class TenantEvidenceRepository
  extends AuditedRepository
  implements EvidenceStore
{
  constructor(exec: ScopedExecutor, session: AuthSession) {
    super(exec, session);
  }

  async create(version: NewEvidenceVersion): Promise<void> {
    authorize(this.session, PERMISSIONS.WRITE);
    const id = entityId(version.evidenceId, version.version);
    await this.recordWrite({
      entity: "evidence",
      entityId: id,
      action: "create",
      readValue: () => this.readRaw(version.evidenceId, version.version),
      write: () => this.insert(version),
    });
  }

  async get(
    evidenceId: string,
    version: number,
  ): Promise<EvidenceMetadata | null> {
    authorize(this.session, PERMISSIONS.READ);
    return this.readRaw(evidenceId, version);
  }

  async latestVersion(evidenceId: string): Promise<number> {
    authorize(this.session, PERMISSIONS.READ);
    const rows = await this.exec.query<EvidenceRow>(
      `SELECT version FROM ${this.exec.table("evidence")}
        WHERE evidence_id = $1 ORDER BY version DESC LIMIT 1`,
      [evidenceId],
    );
    const row = rows[0];
    return row ? Number(row.version) : 0;
  }

  async list(): Promise<EvidenceMetadata[]> {
    authorize(this.session, PERMISSIONS.READ);
    const rows = await this.exec.query<EvidenceRow>(
      `SELECT ${COLUMNS} FROM ${this.exec.table("evidence")}
        ORDER BY evidence_id, version`,
    );
    return rows.map(toMetadata);
  }

  async recordDownloadGrant(grant: DownloadGrant): Promise<void> {
    // Downloading is a read action; any authenticated tenant user may do it, but
    // every grant is recorded in the immutable audit log.
    authorize(this.session, PERMISSIONS.READ);
    await this.audit.append({
      action: "create",
      entity: "evidence_download_grant",
      entityId: entityId(grant.evidenceId, grant.version),
      oldValue: null,
      newValue: {
        objectKey: grant.objectKey,
        expiresAt: grant.expiresAt,
        grantedTo: this.session.userId,
      },
    });
  }

  private async readRaw(
    evidenceId: string,
    version: number,
  ): Promise<EvidenceMetadata | null> {
    const rows = await this.exec.query<EvidenceRow>(
      `SELECT ${COLUMNS} FROM ${this.exec.table("evidence")}
        WHERE evidence_id = $1 AND version = $2`,
      [evidenceId, version],
    );
    const row = rows[0];
    return row ? toMetadata(row) : null;
  }

  private async insert(version: NewEvidenceVersion): Promise<void> {
    await this.exec.query(
      `INSERT INTO ${this.exec.table("evidence")}
         (evidence_id, version, version_hash, content_hash, file_name,
          content_type, size_bytes, links, scan_status, scanner, object_key,
          uploaded_by, uploaded_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'quarantined', NULL, $9, $10, $11)`,
      [
        version.evidenceId,
        version.version,
        version.versionHash,
        version.contentHash,
        version.fileName,
        version.contentType,
        version.sizeBytes,
        JSON.stringify(version.links),
        version.objectKey,
        this.session.userId,
        new Date().toISOString(),
      ],
    );
  }
}
