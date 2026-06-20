import type { Locale } from "@eqa/content";
import { loadBundledCatalog } from "@eqa/content";
import {
  createSeeraDemoAssessmentName,
  createSeeraDemoEvidenceMetadata,
  renderQuestionnaire,
  ROLE_LABELS,
  SEERA_DEMO_PACK_ID,
  SEERA_DEMO_PACK_VERSION,
  SEERA_DEMO_STANDARDS,
  type DashboardRole,
  type EvidenceMetadataForPack,
} from "@eqa/workflows";

export type PresentedScanStatus = "quarantined" | "clean" | "infected";

export interface PresentedEvidenceItem {
  readonly id: string;
  readonly evidenceId: string;
  readonly version: number;
  readonly fileName: string;
  readonly typeLabelEn: string;
  readonly typeLabelAr: string;
  readonly standardNumber: string;
  readonly standardTitleEn: string;
  readonly standardTitleAr: string;
  readonly evidenceRefEn: string;
  readonly evidenceRefAr: string;
  readonly scanStatus: PresentedScanStatus;
  readonly scanLabelEn: string;
  readonly scanLabelAr: string;
  readonly downloadable: boolean;
  readonly sizeBytes: number;
  readonly sizeLabelEn: string;
  readonly sizeLabelAr: string;
  readonly contentType: string;
  readonly uploadedAt: string;
  readonly links: readonly string[];
  readonly quarantineNoteEn: string;
  readonly quarantineNoteAr: string;
}

export interface EvidencePresentation {
  readonly assessmentName: string;
  readonly locale: Locale;
  readonly role: DashboardRole;
  readonly roleLabel: string;
  readonly isSummaryView: boolean;
  readonly items: readonly PresentedEvidenceItem[];
  readonly quarantinedCount: number;
  readonly clearedCount: number;
}

const STANDARD_TITLE: Record<string, { en: string; ar: string }> = {
  [SEERA_DEMO_STANDARDS.ETHICS]: {
    en: "Ethics & professional conduct",
    ar: "الأخلاق والسلوك المهني",
  },
  [SEERA_DEMO_STANDARDS.OBJECTIVITY]: {
    en: "Objectivity & independence",
    ar: "الموضوعية والاستقلالية",
  },
  [SEERA_DEMO_STANDARDS.ORG_INDEPENDENCE]: {
    en: "Organisational independence",
    ar: "الاستقلالية المؤسسية",
  },
};

function formatBytes(bytes: number, locale: Locale): string {
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

function contentTypeLabel(contentType: string, locale: Locale): string {
  if (contentType.includes("pdf")) {
    return locale === "ar" ? "مستند PDF" : "PDF document";
  }
  if (contentType.includes("spreadsheet") || contentType.includes("excel")) {
    return locale === "ar" ? "جدول بيانات" : "Spreadsheet";
  }
  if (contentType.includes("wordprocessing") || contentType.includes("msword")) {
    return locale === "ar" ? "مستند Word" : "Word document";
  }
  if (contentType.startsWith("image/")) {
    return locale === "ar" ? "صورة" : "Image";
  }
  return locale === "ar" ? "ملف" : "File";
}

function linkedStandard(links: readonly string[]): string {
  for (const link of links) {
    if (link in STANDARD_TITLE) return link;
    const match = /^\d+\.\d+$/.exec(link);
    if (match) return match[0];
  }
  return links[0] ?? "—";
}

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

function standardTitle(
  standardNumber: string,
  questionnaireEn: ReturnType<typeof renderQuestionnaire>,
  questionnaireAr: ReturnType<typeof renderQuestionnaire>,
): { en: string; ar: string } {
  const preset = STANDARD_TITLE[standardNumber];
  if (preset) return preset;

  for (const domain of questionnaireEn.domains) {
    for (const principle of domain.principles) {
      for (const std of principle.standards) {
        if (std.number === standardNumber) {
          let titleAr = std.title;
          for (const domainAr of questionnaireAr.domains) {
            for (const principleAr of domainAr.principles) {
              for (const stdAr of principleAr.standards) {
                if (stdAr.number === standardNumber) {
                  titleAr = stdAr.title;
                }
              }
            }
          }
          return { en: std.title, ar: titleAr };
        }
      }
    }
  }
  return { en: standardNumber, ar: standardNumber };
}

function presentItem(
  meta: EvidenceMetadataForPack,
  questionnaireEn: ReturnType<typeof renderQuestionnaire>,
  questionnaireAr: ReturnType<typeof renderQuestionnaire>,
): PresentedEvidenceItem {
  const standardNumber = linkedStandard(meta.links);
  const titles = standardTitle(
    standardNumber,
    questionnaireEn,
    questionnaireAr,
  );
  const scanStatus = normalizeScanStatus(meta.scanStatus);
  const scan = scanLabels(scanStatus);

  return {
    id: `${meta.evidenceId}@${meta.version}`,
    evidenceId: meta.evidenceId,
    version: meta.version,
    fileName: meta.fileName,
    typeLabelEn: contentTypeLabel(meta.contentType, "en"),
    typeLabelAr: contentTypeLabel(meta.contentType, "ar"),
    standardNumber,
    standardTitleEn: titles.en,
    standardTitleAr: titles.ar,
    evidenceRefEn: `${meta.evidenceId} v${meta.version}`,
    evidenceRefAr: `${meta.evidenceId} (إصدار ${meta.version})`,
    scanStatus,
    scanLabelEn: scan.en,
    scanLabelAr: scan.ar,
    downloadable: scanStatus === "clean",
    sizeBytes: meta.sizeBytes,
    sizeLabelEn: formatBytes(meta.sizeBytes, "en"),
    sizeLabelAr: formatBytes(meta.sizeBytes, "ar"),
    contentType: meta.contentType,
    uploadedAt: meta.uploadedAt,
    links: meta.links,
    quarantineNoteEn: scan.noteEn,
    quarantineNoteAr: scan.noteAr,
  };
}

export function buildEvidencePresentation(
  locale: Locale,
  role: DashboardRole,
): EvidencePresentation {
  const catalog = loadBundledCatalog();
  const pack = catalog.get(SEERA_DEMO_PACK_ID, SEERA_DEMO_PACK_VERSION);
  const questionnaireEn = renderQuestionnaire(pack, "en");
  const questionnaireAr = renderQuestionnaire(pack, "ar");
  const metadata = createSeeraDemoEvidenceMetadata();

  const items = metadata.map((meta) =>
    presentItem(meta, questionnaireEn, questionnaireAr),
  );

  const quarantinedCount = items.filter(
    (i) => i.scanStatus === "quarantined",
  ).length;
  const clearedCount = items.filter((i) => i.scanStatus === "clean").length;

  return {
    assessmentName: createSeeraDemoAssessmentName()[locale],
    locale,
    role,
    roleLabel: ROLE_LABELS[role][locale],
    isSummaryView: role === "board",
    items,
    quarantinedCount,
    clearedCount,
  };
}
