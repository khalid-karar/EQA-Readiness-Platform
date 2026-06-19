/**
 * The assessment content model. All authored text is original, synthetic
 * placeholder content. Standards are referenced structurally by their number and
 * a short original title only — no IIA copyrighted text is reproduced.
 *
 * The model is a plain, immutable value tree. It is never hardcoded in logic; it
 * is loaded from versioned seed files (see {@link loadContentPack}).
 */

/** Supported content locales. */
export type Locale = "en" | "ar";

/** A bilingual field. Both languages are required throughout the content. */
export interface LocalizedText {
  readonly en: string;
  readonly ar: string;
}

/** An original assessment question authored against a standard. */
export interface Question {
  readonly id: string;
  readonly text: LocalizedText;
}

/** A prompt describing the evidence an auditor should gather for a standard. */
export interface EvidencePrompt {
  readonly id: string;
  readonly text: LocalizedText;
}

/** One level of a scoring rubric (e.g. 0 = not met … 3 = fully met). */
export interface RubricLevel {
  readonly level: number;
  readonly label: LocalizedText;
  readonly descriptor: LocalizedText;
}

/** The scoring rubric attached to a standard. */
export interface ScoringRubric {
  readonly levels: readonly RubricLevel[];
}

/** A single working-paper review checklist item. */
export interface ChecklistItem {
  readonly id: string;
  readonly text: LocalizedText;
}

/**
 * A standard, referenced by its structural number and a short original title.
 * Carries the original assessment content authored against it.
 */
export interface Standard {
  readonly number: string;
  readonly title: LocalizedText;
  readonly questions: readonly Question[];
  readonly evidencePrompts: readonly EvidencePrompt[];
  readonly rubric: ScoringRubric;
  readonly reviewChecklist: readonly ChecklistItem[];
}

/** A principle grouping a set of standards. */
export interface Principle {
  readonly id: string;
  readonly number: string;
  readonly title: LocalizedText;
  readonly standards: readonly Standard[];
}

/** A domain grouping a set of principles — the top of the taxonomy. */
export interface Domain {
  readonly id: string;
  readonly number: string;
  readonly title: LocalizedText;
  readonly principles: readonly Principle[];
}

/** Approval lifecycle of a content pack version. */
export type ApprovalStatus = "draft" | "in_review" | "approved" | "superseded";

/** One entry in a content pack's changelog. */
export interface ChangelogEntry {
  readonly version: string;
  readonly date: string;
  readonly author: string;
  readonly summary: LocalizedText;
}

/**
 * Governance metadata carried by every content pack.
 *
 * `contentPackId` + `version` together identify an immutable snapshot. Changing
 * any content requires publishing a new `version`; an existing version is never
 * edited in place (see {@link ContentCatalog}).
 */
export interface GovernanceMetadata {
  readonly taxonomyVersion: string;
  readonly contentPackId: string;
  readonly version: string;
  readonly author: string;
  readonly reviewer: string;
  readonly approvalStatus: ApprovalStatus;
  readonly effectiveDate: string;
  readonly changelog: readonly ChangelogEntry[];
}

/**
 * A loaded, validated, deep-frozen content pack. `contentHash` is the SHA-256 of
 * the canonical content and acts as the integrity fingerprint of this exact
 * version: an assessment pins both the version and the hash, so a swap can never
 * go unnoticed.
 */
export interface ContentPack {
  readonly meta: GovernanceMetadata;
  readonly domains: readonly Domain[];
  readonly contentHash: string;
}
