import { ContentNotFoundError, ContentPinMismatchError } from "./errors";
import type { ChecklistItem, ContentPack, Standard } from "./types";
import type { ContentCatalog } from "./catalog";

/**
 * A stable reference to the exact content version whose Working-Paper Review
 * Checklist applies. Mirrors the assessment {@link ContentPin} shape (pack id +
 * version + hash) without coupling to the assessment domain — a review checklist
 * row carries this pin so every {@link ChecklistResult} is tied to the exact
 * checklist version used, not "latest".
 */
export interface ReviewChecklistPin {
  readonly contentPackId: string;
  readonly version: string;
  readonly contentHash: string;
}

/** Lifecycle of a completed internal audit engagement. */
export type EngagementStatus = "completed" | "in_progress";

/**
 * A completed internal audit engagement (synthetic). Top of the working-paper
 * review hierarchy: an engagement owns audit files, which own working papers.
 */
export interface AuditEngagement {
  readonly engagementId: string;
  readonly title: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly status: EngagementStatus;
  readonly createdBy: string;
  readonly createdAt: string;
}

export interface CreateAuditEngagementInput {
  readonly title: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly status?: EngagementStatus;
}

/**
 * An audit file (working-paper file) belonging to an {@link AuditEngagement}.
 */
export interface AuditFile {
  readonly fileId: string;
  readonly engagementId: string;
  readonly name: string;
  readonly description: string | null;
  readonly createdBy: string;
  readonly createdAt: string;
}

export interface CreateAuditFileInput {
  readonly engagementId: string;
  readonly name: string;
  readonly description?: string;
}

/**
 * An individual working-paper record within an {@link AuditFile}.
 */
export interface WorkingPaper {
  readonly workingPaperId: string;
  readonly fileId: string;
  readonly reference: string;
  readonly title: string;
  readonly preparedBy: string;
  readonly preparedAt: string;
}

export interface CreateWorkingPaperInput {
  readonly fileId: string;
  readonly reference: string;
  readonly title: string;
  readonly preparedAt?: string;
}

/**
 * A review checklist attached to a {@link WorkingPaper}. Does NOT duplicate the
 * Step 5 checklist items — it references the Working-Paper Review Checklist for
 * a standard via {@link ReviewChecklistPin}, so results are evaluated against the
 * exact authored checklist version.
 */
export interface ReviewChecklist {
  readonly checklistId: string;
  readonly workingPaperId: string;
  /** The standard whose review checklist from the content pack applies. */
  readonly standardNumber: string;
  readonly pin: ReviewChecklistPin;
  readonly createdBy: string;
  readonly createdAt: string;
}

export interface CreateReviewChecklistInput {
  readonly workingPaperId: string;
  readonly standardNumber: string;
  readonly pin: ReviewChecklistPin;
}

/** Per-item conformance: was the documented methodology followed for this item? */
export type ChecklistConformance =
  | "conforms"
  | "does_not_conform"
  | "not_applicable";

/**
 * The conformance result for one checklist item on a {@link ReviewChecklist}.
 * `checklistItemId` matches an item id from the pinned content (e.g. "WP-C1").
 */
export interface ChecklistResult {
  readonly resultId: string;
  readonly checklistId: string;
  readonly checklistItemId: string;
  readonly conformance: ChecklistConformance;
  readonly note: string | null;
  readonly recordedBy: string;
  readonly recordedAt: string;
}

export interface RecordChecklistResultInput {
  readonly checklistId: string;
  readonly checklistItemId: string;
  readonly conformance: ChecklistConformance;
  readonly note?: string;
}

/**
 * Records which {@link AuditEngagement} was sampled for working-paper review.
 */
export interface SampleSelection {
  readonly selectionId: string;
  readonly engagementId: string;
  readonly rationale: string;
  readonly selectedBy: string;
  readonly selectedAt: string;
}

export interface CreateSampleSelectionInput {
  readonly engagementId: string;
  readonly rationale: string;
}

/** Locates a standard inside a loaded content pack. */
export function findStandardInPack(
  pack: ContentPack,
  standardNumber: string,
): Standard | null {
  for (const domain of pack.domains) {
    for (const principle of domain.principles) {
      for (const standard of principle.standards) {
        if (standard.number === standardNumber) return standard;
      }
    }
  }
  return null;
}

/**
 * Returns the Working-Paper Review Checklist items for a standard from a loaded
 * content pack. The checklist text lives in Step 5 content only — this helper
 * reads it, never duplicates it.
 */
export function checklistItemsForStandard(
  pack: ContentPack,
  standardNumber: string,
): readonly ChecklistItem[] {
  const standard = findStandardInPack(pack, standardNumber);
  if (!standard) {
    throw new ContentNotFoundError(
      `Standard '${standardNumber}' not found in content pack ` +
        `'${pack.meta.contentPackId}@${pack.meta.version}'.`,
    );
  }
  return standard.reviewChecklist;
}

/**
 * Resolves the pinned content and returns the checklist items for a standard.
 * Verifies the content hash matches the pin (fails closed on divergence).
 */
export function resolveChecklistItems(
  catalog: ContentCatalog,
  pin: ReviewChecklistPin,
  standardNumber: string,
): readonly ChecklistItem[] {
  const pack = catalog.get(pin.contentPackId, pin.version);
  if (pack.contentHash !== pin.contentHash) {
    throw new ContentPinMismatchError(
      `Pinned checklist content (${pin.contentPackId}@${pin.version}) ` +
        `no longer matches the catalog.`,
    );
  }
  return checklistItemsForStandard(pack, standardNumber);
}
