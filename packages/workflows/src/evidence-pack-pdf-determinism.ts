import type { EvidencePackManifest } from "./evidence-pack";
import {
  evidencePackPdfSha256,
  PINNED_CHROMIUM_REVISION,
} from "./evidence-pack-pdf-chromium";
import { renderEvidencePackPdf } from "./evidence-pack-pdf";

export interface PdfDeterminismMismatch {
  readonly label: string;
  readonly firstBytes: number;
  readonly secondBytes: number;
  readonly firstSha256: string;
  readonly secondSha256: string;
}

/** True when two rendered PDF buffers are identical byte-for-byte. */
export function evidencePackPdfsByteIdentical(
  first: Uint8Array,
  second: Uint8Array,
): boolean {
  if (first.length !== second.length) {
    return false;
  }
  for (let i = 0; i < first.length; i += 1) {
    if (first[i] !== second[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Renders the same manifest twice and returns mismatch details when PDF bytes differ.
 * Callers should run with independent Chromium launches (EQA_PDF_REUSE_BROWSER=false)
 * so drift across browser instances is caught, not masked by a shared process.
 */
export async function checkEvidencePackPdfDeterminism(
  manifest: EvidencePackManifest,
  label: string,
): Promise<PdfDeterminismMismatch | undefined> {
  const first = await renderEvidencePackPdf(manifest);
  const second = await renderEvidencePackPdf(manifest);

  if (evidencePackPdfsByteIdentical(first, second)) {
    return undefined;
  }

  return {
    label,
    firstBytes: first.length,
    secondBytes: second.length,
    firstSha256: evidencePackPdfSha256(first),
    secondSha256: evidencePackPdfSha256(second),
  };
}

export function formatPdfDeterminismMismatch(
  mismatch: PdfDeterminismMismatch,
): string {
  return (
    `Evidence pack PDF determinism failed for ${mismatch.label} ` +
    `(Chromium ${PINNED_CHROMIUM_REVISION}): ` +
    `render 1 ${mismatch.firstBytes} bytes SHA-256 ${mismatch.firstSha256}, ` +
    `render 2 ${mismatch.secondBytes} bytes SHA-256 ${mismatch.secondSha256}. ` +
    `Two renders from the same input must be byte-identical.`
  );
}
