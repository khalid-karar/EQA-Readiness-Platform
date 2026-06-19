export class ContentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Thrown when a seed file fails structural/bilingual validation. */
export class ContentValidationError extends ContentError {
  constructor(
    message: string,
    readonly path: string,
  ) {
    super(`Content validation failed at '${path}': ${message}`);
  }
}

/**
 * Thrown when something attempts to change a content pack version in place. A
 * version is an immutable snapshot — changes must be published as a new version.
 */
export class ContentVersionImmutableError extends ContentError {}

/** Thrown when a requested content pack id/version is not in the catalog. */
export class ContentNotFoundError extends ContentError {}

/**
 * Thrown when a pinned assessment reference no longer matches the catalog
 * content (the stored content hash differs from the pin). Indicates tampering or
 * an illegal in-place change.
 */
export class ContentPinMismatchError extends ContentError {}
