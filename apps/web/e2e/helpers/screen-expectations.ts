import type { Locale } from "@eqa/content";
import { buildAssessmentPresentation } from "../../lib/present-assessment";
import { buildEvidencePresentation } from "../../lib/present-evidence";
import { buildWorkingPapersPresentation } from "../../lib/present-working-papers";

export interface AssessmentScreenMarkers {
  readonly standardNumber: string;
  readonly pinSnippet: string;
  readonly questionId: string;
  readonly rowCount: number;
  readonly responseAnswer: string;
}

export interface EvidenceScreenMarkers {
  readonly rowCount: number;
  readonly clearedCount: number;
  readonly quarantinedCount: number;
  readonly cleanFileName: string;
  readonly cleanStandardNumber: string;
  readonly quarantinedFileName: string;
}

export interface WorkingPapersScreenMarkers {
  readonly rowCount: number;
  readonly unreviewedCount: number;
  readonly workingPaperRef: string;
  readonly itemId: string;
  readonly engagementTitleSnippet: string;
  readonly conformantItemTextSnippet: string;
}

/** Synthetic fixture markers for Assessment — same source as the UI presenters. */
export function assessmentScreenMarkers(locale: Locale): AssessmentScreenMarkers {
  const presentation = buildAssessmentPresentation(locale, "cae");
  const objectivity = presentation.standards.find(
    (s) => s.standardNumber === "1.2",
  );
  const question = objectivity?.questions.find(
    (q) => q.questionId === "Q-1-2-1",
  );
  return {
    standardNumber: objectivity?.standardNumber ?? "1.2",
    pinSnippet: "eqa-foundations",
    questionId: question?.questionId ?? "Q-1-2-1",
    rowCount: presentation.standards.length,
    responseAnswer: question?.answer ?? "2",
  };
}

/** Synthetic fixture markers for Evidence repository screen. */
export function evidenceScreenMarkers(locale: Locale): EvidenceScreenMarkers {
  const presentation = buildEvidencePresentation(locale, "cae");
  const clean = presentation.items.find((i) => i.evidenceId === "ev-ethics-charter");
  const quarantined = presentation.items.find(
    (i) => i.evidenceId === "ev-coi-spreadsheet",
  );
  return {
    rowCount: presentation.items.length,
    clearedCount: presentation.clearedCount,
    quarantinedCount: presentation.quarantinedCount,
    cleanFileName: clean?.fileName ?? "ethics-charter-acknowledgements.pdf",
    cleanStandardNumber: clean?.standardNumber ?? "1.1",
    quarantinedFileName: quarantined?.fileName ?? "coi-declarations-register.xlsx",
  };
}

/** Synthetic fixture markers for Working Papers screen. */
export function workingPapersScreenMarkers(locale: Locale): WorkingPapersScreenMarkers {
  const presentation = buildWorkingPapersPresentation(locale, "cae");
  const conformant = presentation.items.find((i) => i.itemId === "C-1-1-1");
  const engagementSnippet =
    locale === "ar"
      ? presentation.engagementTitleAr.slice(0, 12)
      : presentation.engagementTitleEn.slice(0, 12);
  const itemTextSnippet =
    locale === "ar"
      ? (conformant?.itemTextAr ?? "").slice(0, 12)
      : (conformant?.itemTextEn ?? "").slice(0, 12);
  return {
    rowCount: presentation.items.length,
    unreviewedCount: presentation.unreviewedCount,
    workingPaperRef: conformant?.workingPaperRef ?? "WP-1.1",
    itemId: conformant?.itemId ?? "C-1-1-1",
    engagementTitleSnippet: engagementSnippet,
    conformantItemTextSnippet: itemTextSnippet,
  };
}
