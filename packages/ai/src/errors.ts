export class AiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/**
 * Thrown when a personal identifier (a name) would reach the inference boundary
 * un-redacted. The message intentionally never includes the offending value, so
 * the guard cannot itself leak personal data into logs.
 */
export class RedactionError extends AiError {}

/**
 * Thrown when the input handed toward the model is not minimized — e.g. an
 * over-long excerpt (a raw file body), too many excerpts, or non-textual/binary
 * content. Only extracted excerpts, structured metadata, and redacted summaries
 * may reach the model.
 */
export class DataMinimizationError extends AiError {}

/**
 * Thrown when an adapter that sends data to an external (out-of-Kingdom) API is
 * used for client evidence. External frontier APIs are not a usable path for
 * evidence by default; the layer fails closed.
 */
export class ExternalAdapterNotAllowedError extends AiError {}

/** Thrown when an adapter cannot be built for the requested configuration. */
export class AiConfigError extends AiError {}
