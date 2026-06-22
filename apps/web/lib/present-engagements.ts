import type { EngagementsLoadResult } from "@eqa/db";
import type { Locale } from "@eqa/content";
import { loadBundledCatalog } from "@eqa/content";
import {
  createSeeraDemoAssessmentName,
  createSeeraDemoWorkingPaperEngagement,
  renderQuestionnaire,
  ROLE_LABELS,
  SEERA_DEMO_ASSESSMENT_ID,
  SEERA_DEMO_PACK_ID,
  SEERA_DEMO_PACK_VERSION,
  SEERA_DEMO_STANDARDS,
  type DashboardRole,
} from "@eqa/workflows";

export interface PresentedEngagementPaper {
  readonly workingPaperId: string;
  readonly reference: string;
  readonly titleEn: string;
  readonly titleAr: string;
  readonly standardNumbers: readonly string[];
  readonly standardTitles: readonly {
    readonly standardNumber: string;
    readonly titleEn: string;
    readonly titleAr: string;
  }[];
  readonly unreviewedCount: number;
  readonly totalItemCount: number;
  readonly reviewedCount: number;
}

export interface PresentedEngagement {
  readonly engagementId: string;
  readonly titleEn: string;
  readonly titleAr: string;
  readonly periodLabelEn: string;
  readonly periodLabelAr: string;
  readonly sampleRationaleEn: string;
  readonly sampleRationaleAr: string;
  readonly papers: readonly PresentedEngagementPaper[];
  readonly unreviewedCount: number;
  readonly totalItemCount: number;
}

export interface EngagementsPresentation {
  readonly assessmentId: string;
  readonly assessmentName: string;
  readonly locale: Locale;
  readonly role: DashboardRole;
  readonly roleLabel: string;
  readonly isSummaryView: boolean;
  readonly canRunAdminActions: boolean;
  readonly contentPackId: string;
  readonly contentPackVersion: string;
  readonly hasGeneratedEvidencePack: boolean;
  readonly evidencePackDownloadPath: string;
  readonly engagements: readonly PresentedEngagement[];
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

function presentPaper(
  paper: EngagementsLoadResult["engagements"][number]["papers"][number],
  questionnaireEn: ReturnType<typeof renderQuestionnaire>,
  questionnaireAr: ReturnType<typeof renderQuestionnaire>,
): PresentedEngagementPaper {
  const standardTitles = paper.standardNumbers.map((standardNumber) => {
    const titles = standardTitle(
      standardNumber,
      questionnaireEn,
      questionnaireAr,
    );
    return {
      standardNumber,
      titleEn: titles.en,
      titleAr: titles.ar,
    };
  });

  return {
    workingPaperId: paper.workingPaperId,
    reference: paper.reference,
    titleEn: paper.title,
    titleAr: paper.title,
    standardNumbers: paper.standardNumbers,
    standardTitles,
    unreviewedCount: paper.unreviewedCount,
    totalItemCount: paper.totalItemCount,
    reviewedCount: paper.totalItemCount - paper.unreviewedCount,
  };
}

function presentEngagement(
  engagement: EngagementsLoadResult["engagements"][number],
  questionnaireEn: ReturnType<typeof renderQuestionnaire>,
  questionnaireAr: ReturnType<typeof renderQuestionnaire>,
): PresentedEngagement {
  const papers = engagement.papers.map((paper) =>
    presentPaper(paper, questionnaireEn, questionnaireAr),
  );
  const unreviewedCount = papers.reduce((n, p) => n + p.unreviewedCount, 0);
  const totalItemCount = papers.reduce((n, p) => n + p.totalItemCount, 0);

  return {
    engagementId: engagement.engagementId,
    titleEn: engagement.title,
    titleAr: engagement.title,
    periodLabelEn: `${engagement.periodStart} — ${engagement.periodEnd}`,
    periodLabelAr: `${engagement.periodStart} — ${engagement.periodEnd}`,
    sampleRationaleEn: engagement.sampleRationale,
    sampleRationaleAr: engagement.sampleRationale,
    papers,
    unreviewedCount,
    totalItemCount,
  };
}

function buildPresentationCore(
  data: {
    assessmentId: string;
    assessmentName: Record<Locale, string>;
    locale: Locale;
    role: DashboardRole;
    contentPackId: string;
    contentVersion: string;
    hasGeneratedEvidencePack: boolean;
    engagements: EngagementsLoadResult["engagements"];
  },
): EngagementsPresentation {
  const catalog = loadBundledCatalog();
  const pack = catalog.get(SEERA_DEMO_PACK_ID, SEERA_DEMO_PACK_VERSION);
  const questionnaireEn = renderQuestionnaire(pack, "en");
  const questionnaireAr = renderQuestionnaire(pack, "ar");
  const isSummaryView = data.role === "board";

  return {
    assessmentId: data.assessmentId,
    assessmentName: data.assessmentName[data.locale],
    locale: data.locale,
    role: data.role,
    roleLabel: ROLE_LABELS[data.role][data.locale],
    isSummaryView,
    canRunAdminActions: !isSummaryView,
    contentPackId: data.contentPackId,
    contentPackVersion: data.contentVersion,
    hasGeneratedEvidencePack: data.hasGeneratedEvidencePack,
    evidencePackDownloadPath: `/api/evidence-pack/download?assessmentId=${encodeURIComponent(data.assessmentId)}`,
    engagements: data.engagements.map((engagement) =>
      presentEngagement(engagement, questionnaireEn, questionnaireAr),
    ),
  };
}

export function buildEngagementsPresentationFromLoad(
  data: EngagementsLoadResult,
): EngagementsPresentation {
  return buildPresentationCore({
    assessmentId: data.assessmentId,
    assessmentName: data.assessmentName,
    locale: data.locale,
    role: data.role,
    contentPackId: data.contentPackId,
    contentVersion: data.contentVersion,
    hasGeneratedEvidencePack: data.hasGeneratedEvidencePack,
    engagements: data.engagements,
  });
}

/** Demo fixture — one sampled engagement with working papers grouped by reference. */
export function buildEngagementsPresentation(
  locale: Locale,
  role: DashboardRole,
): EngagementsPresentation {
  const demo = createSeeraDemoWorkingPaperEngagement();
  const papersByRef = new Map<
    string,
    {
      workingPaperId: string;
      reference: string;
      title: string;
      standardSet: Set<string>;
      unreviewedCount: number;
      totalItemCount: number;
    }
  >();

  for (const item of demo.items) {
    let paper = papersByRef.get(item.workingPaperRef);
    if (!paper) {
      paper = {
        workingPaperId: item.workingPaperRef,
        reference: item.workingPaperRef,
        title: item.workingPaperTitleEn,
        standardSet: new Set<string>(),
        unreviewedCount: 0,
        totalItemCount: 0,
      };
      papersByRef.set(item.workingPaperRef, paper);
    }
    paper.standardSet.add(item.standardNumber);
    paper.totalItemCount += 1;
    if (!item.conformance) {
      paper.unreviewedCount += 1;
    }
  }

  const engagements: EngagementsLoadResult["engagements"] = [
    {
      engagementId: "eng-seera-sample-2025",
      title: demo.titleEn,
      periodStart: demo.periodStart,
      periodEnd: demo.periodEnd,
      sampleRationale: demo.sampleRationaleEn,
      papers: [...papersByRef.values()]
        .map((paper) => ({
          workingPaperId: paper.workingPaperId,
          reference: paper.reference,
          title: paper.title,
          standardNumbers: [...paper.standardSet].sort((a, b) =>
            a.localeCompare(b),
          ),
          unreviewedCount: paper.unreviewedCount,
          totalItemCount: paper.totalItemCount,
        }))
        .sort((a, b) => a.reference.localeCompare(b.reference)),
    },
  ];

  return buildPresentationCore({
    assessmentId: SEERA_DEMO_ASSESSMENT_ID,
    assessmentName: createSeeraDemoAssessmentName(),
    locale,
    role,
    contentPackId: SEERA_DEMO_PACK_ID,
    contentVersion: SEERA_DEMO_PACK_VERSION,
    hasGeneratedEvidencePack: false,
    engagements,
  });
}
