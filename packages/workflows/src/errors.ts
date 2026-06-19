export class WorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Thrown when answering a question id that does not exist in the content pack. */
export class UnknownQuestionError extends WorkflowError {}

/**
 * Thrown when the assessment's content pin does not match the content pack the
 * engine was given (different pack, version, or content hash). Guards against
 * answering against content other than the exact version the assessment started
 * on.
 */
export class PinContentMismatchError extends WorkflowError {}

/**
 * Thrown when an item is moved to a status that the workflow state machine does
 * not permit from its current status. Raised by the pure rules in
 * {@link assertTransition} and surfaced from the data layer so illegal
 * transitions are rejected at persistence time, not merely in the UI.
 */
export class IllegalStatusTransitionError extends WorkflowError {}

/** Thrown when a value is not one of the known item statuses. */
export class UnknownItemStatusError extends WorkflowError {}

/**
 * Thrown when a draft finding (or any non-final value) is asked to be treated as
 * a final conclusion. AI output is draft work product only (rule 12): a draft can
 * become a final conclusion ONLY through the human-review workflow (Step 11),
 * never by reading or coercing the draft. This guard makes the "no draft → final
 * without human review" rule enforceable at runtime, on top of the type-level
 * distinction between {@link DraftFinding} and {@link FinalConclusion}.
 */
export class NotFinalConclusionError extends WorkflowError {}

/**
 * Thrown when the standard referenced by a gap-flagging job is not present in the
 * pinned content pack (a payload/content mismatch). Fails closed so a draft
 * finding is never produced against content the assessment is not pinned to.
 */
export class StandardNotInContentError extends WorkflowError {}

/** Thrown when a human review references a draft finding that does not exist. */
export class DraftFindingNotFoundError extends WorkflowError {}

/** Thrown when a draft finding has already been human-reviewed. */
export class DraftAlreadyReviewedError extends WorkflowError {}

/**
 * Thrown when human review is attempted while the item is not in a reviewable
 * state (must be `ai_flagged` when review begins).
 */
export class IllegalReviewStateError extends WorkflowError {}

/** Thrown when a human review input is invalid (e.g. edit_accept without text). */
export class InvalidReviewInputError extends WorkflowError {}

/** Thrown when a working-paper review references an engagement that does not exist. */
export class EngagementNotFoundError extends WorkflowError {}

/** Thrown when sampling is attempted on a non-completed engagement. */
export class EngagementNotCompletedError extends WorkflowError {}

/** Thrown when a working-paper review references a checklist that does not exist. */
export class ChecklistNotFoundError extends WorkflowError {}

/**
 * Thrown when a conformance result references a checklist item id that is not in
 * the pinned Step 5 checklist for that standard.
 */
export class ChecklistItemNotFoundError extends WorkflowError {}
