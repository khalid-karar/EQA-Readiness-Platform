import { randomUUID } from "node:crypto";
import { AuditLog } from "@eqa/audit-log";
import type { ContentCatalog } from "@eqa/content";
import { loadBundledCatalog } from "@eqa/content";
import type { ObjectStore } from "@eqa/storage";
import type { TenantContext } from "@eqa/tenant";
import {
  isEvidencePackManifest,
  renderQuestionnaire,
  EVIDENCE_PACK_KIND,
  type EvidenceMetadataForPack,
  type EvidencePackAssemblyInput,
  type EvidencePackExportPayload,
  type EvidencePackExportRecord,
  type EvidencePackLoader,
  type EvidencePackSink,
  type FinalConclusion,
  type ItemStatus,
  type RemediationItem,
} from "@eqa/workflows";
import type { Database } from "./database";
import { readLatestMockEqaSimulation } from "./mock-eqa-system";
import { TenantAuditStore } from "./scoped/audit-store";
import { ScopedExecutor } from "./scoped/scoped-executor";
import type { Row } from "./sql-client";

const SYSTEM_PACK_ACTOR = { userId: "system:evidence-pack", role: "system" };

interface StatusRow extends Row {
  question_id: string;
  status: string;
}

interface ResponseRow extends Row {
  question_id: string;
  answer: string;
  note: string | null;
  content_pack_id: string;
  content_version: string;
  content_hash: string;
  responded_by: string;
  responded_at: string;
}

interface ConclusionRow extends Row {
  question_id: string;
  standard_number: string;
  conclusion: string;
}

interface RemediationRow extends Row {
  remediation_id: string;
  question_id: string;
  standard_number: string;
  action: string;
  owner: string;
  target_date: string;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  closed_at: string | null;
  retest_note: string | null;
}

interface EvidenceRow extends Row {
  evidence_id: string;
  version: number | string;
  file_name: string;
  content_type: string;
  size_bytes: number | string;
  links: string;
  scan_status: string;
  uploaded_at: string;
}

interface ExportRow extends Row {
  export_id: string;
  assessment_id: string;
  kind: string;
  locale: string;
  format: string;
  include_raw_evidence: number | string;
  object_key: string;
  file_name: string;
  size_bytes: number | string;
  manifest_json: string;
  generated_by: string;
  generated_at: string;
}

function toRemediationItem(
  row: RemediationRow,
  assessmentId: string,
): RemediationItem {
  return {
    remediationId: row.remediation_id,
    assessmentId,
    questionId: row.question_id,
    standardNumber: row.standard_number,
    action: row.action,
    owner: row.owner,
    targetDate: row.target_date,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
    closedAt: row.closed_at,
    retestNote: row.retest_note,
  };
}

function toEvidenceMetadata(row: EvidenceRow): EvidenceMetadataForPack {
  return {
    evidenceId: row.evidence_id,
    version: Number(row.version),
    fileName: row.file_name,
    contentType: row.content_type,
    sizeBytes: Number(row.size_bytes),
    scanStatus: row.scan_status,
    links: JSON.parse(row.links) as string[],
    uploadedAt: row.uploaded_at,
  };
}

/**
 * Builds the data-layer loader the evidence pack job uses to gather tenant-scoped
 * inputs: statuses, responses, conclusions, remediation, evidence metadata, and
 * optional mock-EQA readiness summary.
 */
export function createEvidencePackLoader(
  db: Database,
  catalog: ContentCatalog = loadBundledCatalog(),
): EvidencePackLoader {
  return {
    async loadAssemblyInput(
      tenant: TenantContext,
      payload: EvidencePackExportPayload,
    ): Promise<EvidencePackAssemblyInput> {
      const exec = new ScopedExecutor(db, tenant);
      const locale = payload.locale ?? "en";
      const pack = catalog.get(payload.contentPackId, payload.contentVersion);
      const questionnaire = renderQuestionnaire(pack, locale);

      const statusRows = await exec.query<StatusRow>(
        `SELECT question_id, status
           FROM ${exec.table("assessment_item_status")}
          WHERE assessment_id = $1`,
        [payload.assessmentId],
      );
      const statusesByQuestion = new Map<string, ItemStatus>(
        statusRows.map((row) => [
          String(row.question_id),
          String(row.status) as ItemStatus,
        ]),
      );

      const responseRows = await exec.query<ResponseRow>(
        `SELECT question_id, answer, note, content_pack_id, content_version,
                content_hash, responded_by, responded_at
           FROM ${exec.table("assessment_responses")}
          WHERE assessment_id = $1`,
        [payload.assessmentId],
      );

      const conclusionRows = await exec.query<ConclusionRow>(
        `SELECT question_id, standard_number, conclusion
           FROM ${exec.table("final_conclusions")}
          WHERE assessment_id = $1`,
        [payload.assessmentId],
      );
      const finalConclusions: FinalConclusion[] = conclusionRows.map((row) => ({
        kind: "final_conclusion",
        assessmentId: payload.assessmentId,
        questionId: String(row.question_id),
        standardNumber: String(row.standard_number),
        conclusion: String(row.conclusion),
      }));

      const remediationRows = await exec.query<RemediationRow>(
        `SELECT remediation_id, question_id, standard_number, action, owner,
                target_date, created_by, created_at, updated_by, updated_at,
                closed_at, retest_note
           FROM ${exec.table("remediation_items")}
          WHERE assessment_id = $1`,
        [payload.assessmentId],
      );

      const evidenceRows = await exec.query<EvidenceRow>(
        `SELECT evidence_id, version, file_name, content_type, size_bytes,
                links, scan_status, uploaded_at
           FROM ${exec.table("evidence")}
          ORDER BY evidence_id, version`,
      );

      const simulation = await readLatestMockEqaSimulation(
        exec,
        payload.assessmentId,
      );

      const readinessInput = {
        assessmentId: payload.assessmentId,
        assessmentName: {
          en: payload.assessmentId,
          ar: payload.assessmentId,
        },
        locale,
        questionnaire,
        statusesByQuestion,
        finalConclusions,
        conformanceByStandard: new Map(),
      };

      const base = {
        assessmentId: payload.assessmentId,
        assessmentName: {
          en: payload.assessmentId,
          ar: payload.assessmentId,
        },
        locale,
        questionnaire,
        statusesByQuestion,
        responses: responseRows.map((row) => ({
          assessmentId: payload.assessmentId,
          questionId: String(row.question_id),
          answer: String(row.answer),
          note: row.note ? String(row.note) : null,
          pin: {
            contentPackId: String(row.content_pack_id),
            version: String(row.content_version),
            contentHash: String(row.content_hash),
          },
          respondedBy: String(row.responded_by),
          respondedAt: String(row.responded_at),
        })),
        finalConclusions,
        remediationItems: remediationRows.map((row) =>
          toRemediationItem(row, payload.assessmentId),
        ),
        evidenceMetadata: evidenceRows.map(toEvidenceMetadata),
        exportId: randomUUID(),
        generatedBy: payload.requestedBy,
      };

      if (simulation !== null) {
        return { ...base, simulation };
      }
      return { ...base, readinessInput };
    },
  };
}

/**
 * Builds the data-layer sink that persists an evidence pack export and stores the
 * PDF in the tenant object store. Raw evidence is never written into the pack
 * object — only the rendered PDF containing references/metadata.
 */
export function createEvidencePackSink(
  db: Database,
  objectStore: ObjectStore,
): EvidencePackSink {
  return {
    async persistExport(
      tenant: TenantContext,
      record: EvidencePackExportRecord,
      requestedBy: string,
    ): Promise<EvidencePackExportRecord> {
      isEvidencePackManifest(record.manifest);
      const exec = new ScopedExecutor(db, tenant);
      const audit = new AuditLog(new TenantAuditStore(exec), SYSTEM_PACK_ACTOR);

      await objectStore.put(record.objectKey, Buffer.from(record.pdfBytes));

      const fileName = `eqa-evidence-pack-${record.manifest.assessmentId}.pdf`;
      await exec.query(
        `INSERT INTO ${exec.table("evidence_pack_exports")}
           (export_id, assessment_id, kind, locale, format, include_raw_evidence,
            object_key, file_name, size_bytes, manifest_json, generated_by,
            generated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          record.exportId,
          record.manifest.assessmentId,
          EVIDENCE_PACK_KIND,
          record.manifest.locale,
          record.manifest.format,
          0,
          record.objectKey,
          fileName,
          record.pdfBytes.length,
          JSON.stringify(record.manifest),
          requestedBy,
          record.manifest.generatedAt,
        ],
      );

      await audit.append({
        action: "create",
        entity: "evidence_pack_export",
        entityId: record.exportId,
        oldValue: null,
        newValue: {
          kind: record.manifest.kind,
          assessmentId: record.manifest.assessmentId,
          bundledFileCount: record.manifest.bundledFileCount,
          sizeBytes: record.pdfBytes.length,
          objectKey: record.objectKey,
          generatedBy: requestedBy,
        },
      });

      return record;
    },
  };
}

/** Reads the latest export for an assessment. */
export async function readLatestEvidencePackExport(
  exec: ScopedExecutor,
  assessmentId: string,
): Promise<{
  exportId: string;
  manifest: import("@eqa/workflows").EvidencePackManifest;
  objectKey: string;
  fileName: string;
  sizeBytes: number;
} | null> {
  const rows = await exec.query<ExportRow>(
    `SELECT export_id, assessment_id, kind, locale, format, include_raw_evidence,
            object_key, file_name, size_bytes, manifest_json, generated_by,
            generated_at
       FROM ${exec.table("evidence_pack_exports")}
      WHERE assessment_id = $1
      ORDER BY generated_at DESC, export_id DESC
      LIMIT 1`,
    [assessmentId],
  );
  const row = rows[0];
  if (!row) return null;
  const parsed: unknown = JSON.parse(row.manifest_json);
  if (!isEvidencePackManifest(parsed)) {
    throw new Error("Stored evidence pack manifest has invalid kind.");
  }
  return {
    exportId: String(row.export_id),
    manifest: parsed,
    objectKey: String(row.object_key),
    fileName: String(row.file_name),
    sizeBytes: Number(row.size_bytes),
  };
}
