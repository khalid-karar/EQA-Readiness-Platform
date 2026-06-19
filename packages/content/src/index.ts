/**
 * @eqa/content
 *
 * Config-driven assessment content: a Domain → Principle → Standard taxonomy
 * (standards referenced structurally by number + short original title), with
 * original Questions, Evidence Prompts, a Scoring Rubric, and a Working-Paper
 * Review Checklist per standard. All fields are bilingual (English + Arabic).
 *
 * Content is never hardcoded in logic — it is loaded from versioned seed files
 * and validated at load time. Each `(contentPackId, version)` is an immutable
 * snapshot; assessments pin a version so changing content later cannot alter
 * historical responses or findings (see {@link ContentCatalog}).
 */

export {
  ContentError,
  ContentNotFoundError,
  ContentPinMismatchError,
  ContentValidationError,
  ContentVersionImmutableError,
} from "./errors";

export type {
  ApprovalStatus,
  ChangelogEntry,
  ChecklistItem,
  ContentPack,
  Domain,
  EvidencePrompt,
  GovernanceMetadata,
  Locale,
  LocalizedText,
  Principle,
  Question,
  RubricLevel,
  ScoringRubric,
  Standard,
} from "./types";

export { localize } from "./localize";
export { loadContentPack, loadContentPacksFromDir } from "./loader";
export { validateContentPack, type ValidatedPack } from "./validate";
export { ContentCatalog, type ContentPin } from "./catalog";
export { bundledSeedsDir, loadBundledCatalog } from "./seeds";
export {
  checklistItemsForStandard,
  findStandardInPack,
  resolveChecklistItems,
  type AuditEngagement,
  type AuditFile,
  type ChecklistConformance,
  type ChecklistResult,
  type CreateAuditEngagementInput,
  type CreateAuditFileInput,
  type CreateReviewChecklistInput,
  type CreateSampleSelectionInput,
  type CreateWorkingPaperInput,
  type EngagementStatus,
  type RecordChecklistResultInput,
  type ReviewChecklist,
  type ReviewChecklistPin,
  type SampleSelection,
  type WorkingPaper,
} from "./working-paper-review";
