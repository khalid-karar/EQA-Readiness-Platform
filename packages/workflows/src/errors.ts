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
