import type { Locale } from "@eqa/content";
import {
  buildEvidencePackManifest,
  createSyntheticEvidencePackInput,
  EVIDENCE_PACK_CONFIDENTIALITY,
  MOCK_EQA_DISCLAIMER,
  ROLE_LABELS,
  type DashboardRole,
} from "@eqa/workflows";

export interface EvidencePackPresentation {
  readonly assessmentId: string;
  readonly assessmentName: string;
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
}

export function buildEvidencePackPresentation(
  locale: Locale,
  role: DashboardRole,
): EvidencePackPresentation {
  const input = createSyntheticEvidencePackInput(locale);
  const manifest = buildEvidencePackManifest(input);
  const isSummaryView = role === "board";
  const evidenceReferenceCount = manifest.standards.reduce(
    (sum, std) => sum + std.evidenceIndex.length,
    0,
  );

  return {
    assessmentId: manifest.assessmentId,
    assessmentName:
      locale === "ar" ? manifest.assessmentName.ar : manifest.assessmentName.en,
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
    standardCount: manifest.standards.length,
    evidenceReferenceCount,
    readinessScore: manifest.readinessSummary.score,
    readinessLabel: manifest.readinessSummary.label,
    bundledFileCount: 0,
    sampleDownloadPath: `/api/evidence-pack/sample?locale=${locale}`,
  };
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
