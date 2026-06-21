import type { PresentedEvidenceItem, PresentedScanStatus } from "./present-evidence";

const STANDARD_TITLE: Record<string, { en: string; ar: string }> = {
  "1.1": {
    en: "Ethics & professional conduct",
    ar: "الأخلاق والسلوك المهني",
  },
  "1.2": {
    en: "Objectivity & independence",
    ar: "الموضوعية والاستقلالية",
  },
  "2.1": {
    en: "Organisational independence",
    ar: "الاستقلالية المؤسسية",
  },
};

function normalizeScanStatus(raw: string): PresentedScanStatus {
  if (raw === "clean") return "clean";
  if (raw === "infected") return "infected";
  return "quarantined";
}

function scanLabels(status: PresentedScanStatus): {
  en: string;
  ar: string;
  noteEn: string;
  noteAr: string;
} {
  switch (status) {
    case "clean":
      return {
        en: "Cleared — available",
        ar: "مُزال الحجر — متاح",
        noteEn: "Malware scan passed. File can be linked in working papers and evidence packs.",
        noteAr: "اجتاز فحص البرمجيات الخبيثة. يمكن ربط الملف في أوراق العمل وحزم الأدلة.",
      };
    case "infected":
      return {
        en: "Blocked — infected",
        ar: "محظور — مصاب",
        noteEn: "Malware scan failed. File remains quarantined and cannot be downloaded.",
        noteAr: "فشل فحص البرمجيات الخبيثة. يبقى الملف في الحجر ولا يمكن تنزيله.",
      };
    default:
      return {
        en: "Quarantined — scan pending",
        ar: "في الحجر — فحص قيد الانتظار",
        noteEn: "Uploaded but not downloadable until the background scan marks it clean.",
        noteAr: "تم الرفع لكنه غير قابل للتنزيل حتى يُعلِم الفحص الخلفي أنه نظيف.",
      };
  }
}

function contentTypeLabel(contentType: string, locale: "en" | "ar"): string {
  if (contentType.includes("pdf")) {
    return locale === "ar" ? "مستند PDF" : "PDF document";
  }
  if (contentType.startsWith("image/")) {
    return locale === "ar" ? "صورة" : "Image";
  }
  return locale === "ar" ? "ملف" : "File";
}

function formatBytes(bytes: number, locale: "en" | "ar"): string {
  const kb = bytes / 1024;
  if (kb < 1024) {
    return locale === "ar"
      ? `${Math.round(kb)} كيلوبايت`
      : `${Math.round(kb)} KB`;
  }
  const mb = kb / 1024;
  return locale === "ar"
    ? `${mb.toFixed(1)} ميجابايت`
    : `${mb.toFixed(1)} MB`;
}

/** Client-safe mapper for a freshly uploaded evidence row (no @eqa/workflows import). */
export function mapUploadedEvidenceItem(input: {
  evidenceId: string;
  version: number;
  scanStatus: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  links: readonly string[];
  uploadedAt: string;
}): PresentedEvidenceItem {
  const standardNumber =
    input.links.find((l) => l in STANDARD_TITLE) ?? input.links[0] ?? "—";
  const titles = STANDARD_TITLE[standardNumber] ?? {
    en: standardNumber,
    ar: standardNumber,
  };
  const scanStatus = normalizeScanStatus(input.scanStatus);
  const scan = scanLabels(scanStatus);

  return {
    id: `${input.evidenceId}@${input.version}`,
    evidenceId: input.evidenceId,
    version: input.version,
    fileName: input.fileName,
    typeLabelEn: contentTypeLabel(input.contentType, "en"),
    typeLabelAr: contentTypeLabel(input.contentType, "ar"),
    standardNumber,
    standardTitleEn: titles.en,
    standardTitleAr: titles.ar,
    evidenceRefEn: `${input.evidenceId} v${input.version}`,
    evidenceRefAr: `${input.evidenceId} (إصدار ${input.version})`,
    scanStatus,
    scanLabelEn: scan.en,
    scanLabelAr: scan.ar,
    downloadable: scanStatus === "clean",
    sizeBytes: input.sizeBytes,
    sizeLabelEn: formatBytes(input.sizeBytes, "en"),
    sizeLabelAr: formatBytes(input.sizeBytes, "ar"),
    contentType: input.contentType,
    uploadedAt: input.uploadedAt,
    links: input.links,
    quarantineNoteEn: scan.noteEn,
    quarantineNoteAr: scan.noteAr,
  };
}
