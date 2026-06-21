import type { EvidencePackLoadResult } from "@eqa/db";
import type { Locale } from "@eqa/content";
import { loadBundledCatalog } from "@eqa/content";
import {
  buildEvidencePackManifest,
  createSyntheticEvidencePackInput,
  EVIDENCE_PACK_CONFIDENTIALITY,
  MOCK_EQA_DISCLAIMER,
  ROLE_LABELS,
  renderQuestionnaire,
  type DashboardRole,
  type EvidencePackAssemblyInput,
} from "@eqa/workflows";
import {
  SEERA_DEMO_PACK_ID,
  SEERA_DEMO_PACK_VERSION,
} from "@eqa/workflows";

export interface PresentedPackPreviewRow {
  readonly id: string;
  readonly standardNumber: string;
  readonly standardTitleEn: string;
  readonly standardTitleAr: string;
  readonly domainNumber: string;
  readonly evidenceRefCount: number;
  readonly gapSummaryEn: string;
  readonly gapSummaryAr: string;
}

export interface EvidencePackPresentation {
  readonly assessmentId: string;
  readonly assessmentName: string;
  readonly assessmentNameEn: string;
  readonly assessmentNameAr: string;
  readonly locale: Locale;
  readonly role: DashboardRole;
  readonly roleLabel: string;
  readonly isSummaryView: boolean;
  readonly canGenerate: boolean;
  readonly disclaimerText: string;
  readonly disclaimerShort: string;
  readonly confidentialityText: string;
  readonly standardCount: number;
  readonly evidenceReferenceCount: number;
  readonly readinessScore: number;
  readonly readinessLabel: string;
  readonly bundledFileCount: 0;
  readonly sampleDownloadPath: string;
  readonly downloadPath: string;
  readonly hasGeneratedExport: boolean;
  readonly contentPackId: string;
  readonly contentPackVersion: string;
  readonly previewRows: readonly PresentedPackPreviewRow[];
}

export function buildEvidencePackPresentationFromLoad(
  data: EvidencePackLoadResult,
): EvidencePackPresentation {
  const catalog = loadBundledCatalog();
  const pack = catalog.get(SEERA_DEMO_PACK_ID, SEERA_DEMO_PACK_VERSION);
  const base = data.assemblyInput;
  const inputEn: EvidencePackAssemblyInput = {
    ...base,
    locale: "en",
    questionnaire: renderQuestionnaire(pack, "en"),
  };
  const inputAr: EvidencePackAssemblyInput = {
    ...base,
    locale: "ar",
    questionnaire: renderQuestionnaire(pack, "ar"),
  };
  return buildEvidencePackPresentationFromAssembly(
    inputEn,
    inputAr,
    data.locale,
    data.role,
    {
      hasGeneratedExport: data.persistedManifest !== null,
      assessmentId: base.assessmentId,
    },
  );
}

function buildEvidencePackPresentationFromAssembly(
  inputEn: EvidencePackAssemblyInput,
  inputAr: EvidencePackAssemblyInput,
  locale: Locale,
  role: DashboardRole,
  options?: {
    hasGeneratedExport?: boolean;
    assessmentId?: string;
  },
): EvidencePackPresentation {
  const manifestEn = buildEvidencePackManifest(inputEn);
  const manifestAr = buildEvidencePackManifest(inputAr);
  const isSummaryView = role === "board";

  const arByStandard = new Map(
    manifestAr.standards.map((s) => [s.standardNumber, s]),
  );

  const previewRows: PresentedPackPreviewRow[] = manifestEn.standards.map(
    (std) => {
      const arStd = arByStandard.get(std.standardNumber);
      return {
        id: std.standardNumber,
        standardNumber: std.standardNumber,
        standardTitleEn: std.standardTitle,
        standardTitleAr: arStd?.standardTitle ?? std.standardTitle,
        domainNumber: std.domainNumber,
        evidenceRefCount: std.evidenceIndex.length,
        gapSummaryEn: std.gapStatusSummary,
        gapSummaryAr: arStd?.gapStatusSummary ?? std.gapStatusSummary,
      };
    },
  );

  const evidenceReferenceCount = previewRows.reduce(
    (sum, row) => sum + row.evidenceRefCount,
    0,
  );

  const assessmentId = options?.assessmentId ?? manifestEn.assessmentId;
  const hasGeneratedExport = options?.hasGeneratedExport ?? false;
  const generatedDownloadPath = `/api/evidence-pack/download?assessmentId=${encodeURIComponent(assessmentId)}`;

  return {
    assessmentId,
    assessmentName:
      locale === "ar"
        ? manifestEn.assessmentName.ar
        : manifestEn.assessmentName.en,
    assessmentNameEn: manifestEn.assessmentName.en,
    assessmentNameAr: manifestEn.assessmentName.ar,
    locale,
    role,
    roleLabel: ROLE_LABELS[role][locale],
    isSummaryView,
    canGenerate: !isSummaryView,
    disclaimerText:
      locale === "ar" ? MOCK_EQA_DISCLAIMER.ar : MOCK_EQA_DISCLAIMER.en,
    disclaimerShort:
      locale === "ar"
        ? MOCK_EQA_DISCLAIMER.shortAr
        : MOCK_EQA_DISCLAIMER.shortEn,
    confidentialityText:
      locale === "ar"
        ? EVIDENCE_PACK_CONFIDENTIALITY.ar
        : EVIDENCE_PACK_CONFIDENTIALITY.en,
    standardCount: previewRows.length,
    evidenceReferenceCount,
    readinessScore: manifestEn.readinessSummary.score,
    readinessLabel: manifestEn.readinessSummary.label,
    bundledFileCount: 0,
    sampleDownloadPath: `/api/evidence-pack/sample?locale=${locale}`,
    downloadPath: hasGeneratedExport
      ? generatedDownloadPath
      : `/api/evidence-pack/sample?locale=${locale}`,
    hasGeneratedExport,
    contentPackId: SEERA_DEMO_PACK_ID,
    contentPackVersion: SEERA_DEMO_PACK_VERSION,
    previewRows,
  };
}

export function buildEvidencePackPresentation(
  locale: Locale,
  role: DashboardRole,
): EvidencePackPresentation {
  const inputEn = createSyntheticEvidencePackInput("en");
  const inputAr = createSyntheticEvidencePackInput("ar");
  return buildEvidencePackPresentationFromAssembly(inputEn, inputAr, locale, role);
}

export function packOutputIncludesDisclaimer(
  presentation: EvidencePackPresentation,
): boolean {
  const text =
    `${presentation.disclaimerText} ${presentation.confidentialityText}`.toLowerCase();
  return (
    text.includes("simulation") ||
    text.includes("محاكاة") ||
    text.includes("confidential") ||
    text.includes("سري") ||
    text.includes("does not replace") ||
    text.includes("لا تحل محل")
  );
}
