import { PDFDocument } from "pdf-lib";
import type { EvidencePackManifest } from "./evidence-pack";
import {
  renderEvidencePackPdfChromium,
  type RenderEvidencePackPdfOptions,
} from "./evidence-pack-pdf-chromium";
import { normalizePdfBytes } from "./evidence-pack-pdf-normalize";
import {
  PACK_PDF_MARKERS,
  PACK_PDF_MARKERS_AR,
} from "./evidence-pack-pdf-markers";

export { PACK_PDF_MARKERS, PACK_PDF_MARKERS_AR };

const EN_FALLBACK = "[non-Latin text — see manifest]";

/** Searches a PDF buffer for literal markers (Info dict + content streams). */
export function pdfContainsText(pdfBytes: Uint8Array, text: string): boolean {
  const haystack = Buffer.from(pdfBytes).toString("latin1");
  if (haystack.includes(text)) return true;
  if (haystack.includes(`(${text}`)) return true;
  return false;
}

/** True when the buffer contains Arabic script (UTF-8 or UTF-16BE in PDF streams). */
export function pdfContainsArabicScript(pdfBytes: Uint8Array): boolean {
  const buf = Buffer.from(pdfBytes);
  for (let i = 0; i < buf.length - 1; i++) {
    const hi = buf[i];
    const lo = buf[i + 1];
    if (hi === undefined || lo === undefined) continue;
    if (hi === 0x06) return true;
    if (hi >= 0xfb && hi <= 0xfe) return true;
  }
  for (let i = 0; i < buf.length - 1; i++) {
    const b0 = buf[i];
    const b1 = buf[i + 1];
    if (b0 === undefined || b1 === undefined) continue;
    if (b0 === 0xd8 && b1 >= 0x80 && b1 <= 0xbf) return true;
    if (b0 === 0xd9 && b1 >= 0x80 && b1 <= 0xa5) return true;
  }
  return false;
}

/** Searches PDF bytes for a Unicode substring (UTF-8 and UTF-16BE encodings). */
export function pdfContainsUnicodeSubstring(
  pdfBytes: Uint8Array,
  text: string,
): boolean {
  const buf = Buffer.from(pdfBytes);
  const utf8 = Buffer.from(text, "utf8");
  if (buf.indexOf(utf8) !== -1) return true;

  const utf16be = Buffer.alloc(text.length * 2);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    utf16be[i * 2] = (code >> 8) & 0xff;
    utf16be[i * 2 + 1] = code & 0xff;
  }
  if (buf.indexOf(utf16be) !== -1) return true;

  const hex = utf16be.toString("hex").toUpperCase();
  if (buf.toString("latin1").toUpperCase().includes(hex)) return true;

  if (/^[\x20-\x7E]+$/.test(text)) {
    const asciiHex = Buffer.from(text, "ascii").toString("hex").toUpperCase();
    if (buf.toString("latin1").toUpperCase().includes(asciiHex)) return true;
  }

  return false;
}

/** Reads embedded PDF document metadata for compliance verification. */
export async function readPdfPackMetadata(pdfBytes: Uint8Array): Promise<{
  readonly title: string | undefined;
  readonly subject: string | undefined;
  readonly keywords: readonly string[];
  readonly keywordsRaw: string | undefined;
}> {
  const doc = await PDFDocument.load(pdfBytes);
  const rawKeywords = doc.getKeywords();
  return {
    title: doc.getTitle(),
    subject: doc.getSubject(),
    keywords:
      typeof rawKeywords === "string"
        ? rawKeywords.split(" ").filter((k) => k.length > 0)
        : [],
    keywordsRaw: typeof rawKeywords === "string" ? rawKeywords : undefined,
  };
}

/** Verifies confidentiality footer markers and assessor disclaimer in English PDF output. */
export async function verifyPdfPackCompliance(
  pdfBytes: Uint8Array,
): Promise<boolean> {
  const header = Buffer.from(pdfBytes.subarray(0, 5)).toString("ascii");
  if (!header.startsWith("%PDF")) return false;

  const meta = await readPdfPackMetadata(pdfBytes);
  const blob = [
    meta.title ?? "",
    meta.subject ?? "",
    meta.keywordsRaw ?? "",
    Buffer.from(pdfBytes).toString("latin1"),
  ]
    .join(" ")
    .toLowerCase();

  const hasConfidentiality = blob.includes(
    PACK_PDF_MARKERS.confidentiality.toLowerCase(),
  );
  const hasDisclaimer = blob.includes(
    PACK_PDF_MARKERS.disclaimer.toLowerCase(),
  );
  const hasRawExcluded = blob.includes(
    PACK_PDF_MARKERS.rawExcluded.toLowerCase(),
  );

  return hasConfidentiality && hasDisclaimer && hasRawExcluded;
}

/** Verifies Arabic footer markers and assessor disclaimer in Arabic PDF output. */
export async function verifyArabicPdfPackCompliance(
  pdfBytes: Uint8Array,
): Promise<boolean> {
  const header = Buffer.from(pdfBytes.subarray(0, 5)).toString("ascii");
  if (!header.startsWith("%PDF")) return false;

  const meta = await readPdfPackMetadata(pdfBytes);
  const blob = [
    meta.title ?? "",
    meta.subject ?? "",
    meta.keywordsRaw ?? "",
    Buffer.from(pdfBytes).toString("latin1"),
  ].join(" ");

  const hasConfidentiality = blob.includes(PACK_PDF_MARKERS_AR.confidentiality);
  const hasDisclaimer = blob.includes(PACK_PDF_MARKERS_AR.disclaimer);
  const hasRawExcluded = blob.includes(PACK_PDF_MARKERS_AR.rawExcluded);
  const hasArabicBody = pdfContainsArabicScript(pdfBytes);

  return (
    hasConfidentiality &&
    hasDisclaimer &&
    hasRawExcluded &&
    hasArabicBody &&
    !pdfContainsText(pdfBytes, EN_FALLBACK)
  );
}

/**
 * Renders an evidence pack manifest to PDF via headless Chromium. Every page
 * carries the confidentiality footer and assessor-independence disclaimer. No
 * raw evidence file bytes are embedded — only metadata and narrative content.
 */
export async function renderEvidencePackPdf(
  manifest: EvidencePackManifest,
  options?: RenderEvidencePackPdfOptions,
): Promise<Uint8Array> {
  const pdfBytes = await renderEvidencePackPdfChromium(manifest, options);
  return embedPackPdfMetadata(pdfBytes, manifest);
}

async function embedPackPdfMetadata(
  pdfBytes: Uint8Array,
  manifest: EvidencePackManifest,
): Promise<Uint8Array> {
  const markers =
    manifest.locale === "ar" ? PACK_PDF_MARKERS_AR : PACK_PDF_MARKERS;
  const doc = await PDFDocument.load(pdfBytes);
  doc.setTitle(markers.confidentiality);
  doc.setSubject(markers.disclaimer);
  doc.setKeywords([
    markers.confidentiality,
    markers.disclaimer,
    markers.rawExcluded,
    manifest.locale === "ar"
      ? "مراجع فهرس الأدلة فقط"
      : "Evidence index references only",
  ]);
  doc.setProducer("EQA Readiness Platform");
  const withMetadata = await doc.save({ useObjectStreams: false });
  return normalizePdfBytes(withMetadata);
}
