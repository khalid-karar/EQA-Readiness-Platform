import type { Locale } from "@eqa/content";
import { loadBundledCatalog, resolveChecklistItems } from "@eqa/content";
import {
  createSeeraDemoAssessmentName,
  createSeeraDemoContentPin,
  createSeeraDemoWorkingPaperEngagement,
  renderQuestionnaire,
  ROLE_LABELS,
  SEERA_DEMO_PACK_ID,
  SEERA_DEMO_PACK_VERSION,
  SEERA_DEMO_STANDARDS,
  type DashboardRole,
  type SeeraDemoWorkingPaperItem,
} from "@eqa/workflows";

export type PresentedWpConformance =
  | "conformant"
  | "partial"
  | "non_conformant"
  | "unreviewed";

export interface PresentedWorkingPaperItem {
  readonly id: string;
  readonly checklistId: string;
  readonly itemId: string;
  readonly engagementTitleEn: string;
  readonly engagementTitleAr: string;
  readonly workingPaperRef: string;
  readonly workingPaperTitleEn: string;
  readonly workingPaperTitleAr: string;
  readonly standardNumber: string;
  readonly standardTitleEn: string;
  readonly standardTitleAr: string;
  readonly itemTextEn: string;
  readonly itemTextAr: string;
  readonly conformance: PresentedWpConformance;
  readonly conformanceLabelEn: string;
  readonly conformanceLabelAr: string;
  readonly note: string | null;
  readonly recordedBy: string | null;
  readonly recordedAt: string | null;
  readonly pinLabelEn: string;
  readonly pinLabelAr: string;
}

export interface WorkingPapersPresentation {
  readonly assessmentName: string;
  readonly locale: Locale;
  readonly role: DashboardRole;
  readonly roleLabel: string;
  readonly isSummaryView: boolean;
  readonly engagementTitleEn: string;
  readonly engagementTitleAr: string;
  readonly periodLabelEn: string;
  readonly periodLabelAr: string;
  readonly sampleRationaleEn: string;
  readonly sampleRationaleAr: string;
  readonly items: readonly PresentedWorkingPaperItem[];
  readonly unreviewedCount: number;
  readonly conformantCount: number;
  readonly partialCount: number;
  readonly nonConformantCount: number;
  readonly reviewedCount: number;
  readonly totalCount: number;
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

function mapConformance(
  raw: SeeraDemoWorkingPaperItem["conformance"],
): {
  status: PresentedWpConformance;
  labelEn: string;
  labelAr: string;
} {
  if (raw === "conforms") {
    return {
      status: "conformant",
      labelEn: "Conformant",
      labelAr: "مطابق",
    };
  }
  if (raw === "does_not_conform") {
    return {
      status: "non_conformant",
      labelEn: "Non-conformant",
      labelAr: "غير مطابق",
    };
  }
  if (raw === "not_applicable") {
    return {
      status: "partial",
      labelEn: "Partial / N/A",
      labelAr: "جزئي / غير منطبق",
    };
  }
  return {
    status: "unreviewed",
    labelEn: "Unreviewed",
    labelAr: "غير مراجَع",
  };
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
  raw: SeeraDemoWorkingPaperItem,
  engagementTitleEn: string,
  engagementTitleAr: string,
  questionnaireEn: ReturnType<typeof renderQuestionnaire>,
  questionnaireAr: ReturnType<typeof renderQuestionnaire>,
  pinLabelEn: string,
  pinLabelAr: string,
): PresentedWorkingPaperItem {
  const catalog = loadBundledCatalog();
  const pin = createSeeraDemoContentPin();
  const contentItems = resolveChecklistItems(
    catalog,
    {
      contentPackId: pin.contentPackId,
      version: pin.version,
      contentHash: pin.contentHash,
    },
    raw.standardNumber,
  );
  const contentItem = contentItems.find((i) => i.id === raw.itemId);
  const titles = standardTitle(
    raw.standardNumber,
    questionnaireEn,
    questionnaireAr,
  );
  const mapped = mapConformance(raw.conformance);

  return {
    id: `${raw.checklistId}@${raw.itemId}`,
    checklistId: raw.checklistId,
    itemId: raw.itemId,
    engagementTitleEn,
    engagementTitleAr,
    workingPaperRef: raw.workingPaperRef,
    workingPaperTitleEn: raw.workingPaperTitleEn,
    workingPaperTitleAr: raw.workingPaperTitleAr,
    standardNumber: raw.standardNumber,
    standardTitleEn: titles.en,
    standardTitleAr: titles.ar,
    itemTextEn: contentItem?.text.en ?? raw.itemId,
    itemTextAr: contentItem?.text.ar ?? raw.itemId,
    conformance: mapped.status,
    conformanceLabelEn: mapped.labelEn,
    conformanceLabelAr: mapped.labelAr,
    note: raw.note,
    recordedBy: raw.recordedBy,
    recordedAt: raw.recordedAt,
    pinLabelEn,
    pinLabelAr,
  };
}

export function buildWorkingPapersPresentation(
  locale: Locale,
  role: DashboardRole,
): WorkingPapersPresentation {
  const catalog = loadBundledCatalog();
  const pack = catalog.get(SEERA_DEMO_PACK_ID, SEERA_DEMO_PACK_VERSION);
  const questionnaireEn = renderQuestionnaire(pack, "en");
  const questionnaireAr = renderQuestionnaire(pack, "ar");
  const engagement = createSeeraDemoWorkingPaperEngagement();
  const pin = createSeeraDemoContentPin();
  const pinLabelEn = `${pin.contentPackId} v${pin.version}`;
  const pinLabelAr = `${pin.contentPackId} (إصدار ${pin.version})`;

  const items = engagement.items.map((raw) =>
    presentItem(
      raw,
      engagement.titleEn,
      engagement.titleAr,
      questionnaireEn,
      questionnaireAr,
      pinLabelEn,
      pinLabelAr,
    ),
  );

  const unreviewedCount = items.filter(
    (i) => i.conformance === "unreviewed",
  ).length;
  const conformantCount = items.filter(
    (i) => i.conformance === "conformant",
  ).length;
  const partialCount = items.filter((i) => i.conformance === "partial").length;
  const nonConformantCount = items.filter(
    (i) => i.conformance === "non_conformant",
  ).length;
  const reviewedCount = conformantCount + partialCount + nonConformantCount;

  const periodLabelEn = `${engagement.periodStart} — ${engagement.periodEnd}`;
  const periodLabelAr = `${engagement.periodStart} — ${engagement.periodEnd}`;

  return {
    assessmentName: createSeeraDemoAssessmentName()[locale],
    locale,
    role,
    roleLabel: ROLE_LABELS[role][locale],
    isSummaryView: role === "board",
    engagementTitleEn: engagement.titleEn,
    engagementTitleAr: engagement.titleAr,
    periodLabelEn,
    periodLabelAr,
    sampleRationaleEn: engagement.sampleRationaleEn,
    sampleRationaleAr: engagement.sampleRationaleAr,
    items,
    unreviewedCount,
    conformantCount,
    partialCount,
    nonConformantCount,
    reviewedCount,
    totalCount: items.length,
  };
}
