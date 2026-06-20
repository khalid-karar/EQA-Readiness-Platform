import type { JobHandler } from "@eqa/jobs";
import type { TenantContext } from "@eqa/tenant";
import {
  buildEvidencePackManifest,
  type EvidencePackAssemblyInput,
  type EvidencePackManifest,
} from "./evidence-pack";
import { renderEvidencePackPdf } from "./evidence-pack-pdf";

/** Job name for the EQA evidence pack export (Step 6.5 background job). */
export const EVIDENCE_PACK_EXPORT_JOB = "export:evidence-pack";

/**
 * Payload enqueued when CAE or Audit Staff requests an evidence pack export.
 * {@link includeRawEvidence} defaults to false — raw confidential files are
 * never bundled unless explicitly authorized in a future build.
 */
export interface EvidencePackExportPayload {
  readonly assessmentId: string;
  readonly contentPackId: string;
  readonly contentVersion: string;
  readonly locale?: "en" | "ar";
  readonly requestedBy: string;
  readonly includeRawEvidence?: boolean;
}

/** Loads pack assembly inputs from the tenant data layer. */
export interface EvidencePackLoader {
  loadAssemblyInput(
    tenant: TenantContext,
    payload: EvidencePackExportPayload,
  ): Promise<EvidencePackAssemblyInput>;
}

/** Renders a manifest to PDF bytes. */
export interface EvidencePackRenderer {
  renderPdf(manifest: EvidencePackManifest): Promise<Uint8Array>;
}

export interface EvidencePackExportRecord {
  readonly exportId: string;
  readonly manifest: EvidencePackManifest;
  readonly pdfBytes: Uint8Array;
  readonly objectKey: string;
}

/** Persists the export record and PDF (tenant-scoped, audited). */
export interface EvidencePackSink {
  persistExport(
    tenant: TenantContext,
    record: EvidencePackExportRecord,
    requestedBy: string,
  ): Promise<EvidencePackExportRecord>;
}

export interface EvidencePackJobDeps {
  readonly loader: EvidencePackLoader;
  readonly renderer: EvidencePackRenderer;
  readonly sink: EvidencePackSink;
}

/**
 * Builds the evidence pack export job handler. Assembles the manifest from
 * tenant-scoped data, renders PDF with confidentiality footer and assessor
 * disclaimer on every page, and persists without bundling raw evidence by
 * default.
 */
export function createEvidencePackHandler(
  deps: EvidencePackJobDeps,
): JobHandler {
  return async (ctx) => {
    const payload = ctx.payload as EvidencePackExportPayload;
    if (payload.includeRawEvidence === true) {
      throw new Error(
        "Raw evidence bundling requires explicit authorization and is not " +
          "enabled in this build. The pack contains references only.",
      );
    }

    const input = await deps.loader.loadAssemblyInput(ctx.tenant, payload);
    const manifest = buildEvidencePackManifest({
      ...input,
      generatedBy: payload.requestedBy,
      locale: payload.locale ?? input.locale,
      format: "pdf",
    });

    const pdfBytes = await deps.renderer.renderPdf(manifest);
    const objectKey = `${ctx.tenant.schemaName}/exports/${manifest.exportId}.pdf`;

    const record = await deps.sink.persistExport(
      ctx.tenant,
      { exportId: manifest.exportId, manifest, pdfBytes, objectKey },
      payload.requestedBy,
    );

    return {
      exportId: record.exportId,
      kind: record.manifest.kind,
      standardCount: record.manifest.standards.length,
      bundledFileCount: record.manifest.bundledFileCount,
      sizeBytes: record.pdfBytes.length,
    };
  };
}

/** Default PDF renderer for production wiring. */
export const defaultEvidencePackRenderer: EvidencePackRenderer = {
  renderPdf: renderEvidencePackPdf,
};
