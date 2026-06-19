/**
 * Where an adapter sends data for inference:
 * - `local`       — in-process stub for dev/test (no network).
 * - `in-kingdom`  — a self-hosted model running inside the KSA environment
 *                   (today's self-hosted adapter, tomorrow's HUMAIN adapter).
 * - `external`    — an out-of-Kingdom frontier API. NOT a usable path for client
 *                   evidence; the inference service refuses these (fails closed).
 */
export type AdapterLocation = "local" | "in-kingdom" | "external";

/** Structured, non-personal metadata values permitted alongside excerpts. */
export type MetadataValue = string | number | boolean;

/**
 * The ONLY shape that reaches a {@link ModelAdapter}. By construction it carries
 * just minimized, redacted material — extracted excerpts, structured metadata,
 * and an optional redacted summary. There is deliberately no field for raw file
 * bytes, so a raw evidence body cannot be passed to the model by type; the
 * data-minimization guard enforces the same at runtime.
 */
export interface InferenceRequest {
  readonly promptVersion: string;
  readonly rubricVersion: string;
  /** Extracted, redacted text excerpts (never a whole file). */
  readonly excerpts: readonly string[];
  /** Structured, non-personal metadata (field names + primitive values). */
  readonly metadata: Readonly<Record<string, MetadataValue>>;
  /** Optional redacted summary. */
  readonly summary?: string;
}

/** The model's raw output. AI output is draft work product only. */
export interface InferenceResult {
  readonly output: string;
  /** Identifier of the concrete model that produced the output. */
  readonly model: string;
}

/**
 * The provider-agnostic inference port. Swappable by config (local stub now,
 * in-Kingdom self-hosted adapter, future HUMAIN adapter) behind this one
 * interface — the same port/adapter pattern as storage and jobs. No vendor is
 * hardcoded into callers.
 */
export interface ModelAdapter {
  /** Stable adapter identifier recorded in call provenance. */
  readonly id: string;
  /** Where this adapter sends data — gates evidence use (see {@link AdapterLocation}). */
  readonly location: AdapterLocation;
  infer(request: InferenceRequest): Promise<InferenceResult>;
}

/**
 * The transport an in-Kingdom adapter wraps (e.g. a self-hosted model server, or
 * a future HUMAIN client). Injected, never hardcoded — so the concrete model is
 * swapped by providing a client, exactly as the object store takes a blob client.
 */
export interface InferenceClient {
  readonly modelId: string;
  complete(request: InferenceRequest): Promise<string>;
}

/** A person whose name must be replaced with a role token before inference. */
export interface Identity {
  readonly name: string;
  /** Role used to build the replacement token, e.g. "cae" → "[CAE]". */
  readonly role: string;
}

/**
 * A request to run an AI review of one assessment item's evidence. The caller
 * supplies already-extracted excerpts and structured metadata (never raw files),
 * plus the identities to redact and the prompt/rubric versions in force. The
 * service redacts, minimizes, and records provenance before any model contact.
 */
export interface EvidenceReviewInput {
  readonly promptVersion: string;
  readonly rubricVersion: string;
  readonly excerpts: readonly string[];
  readonly metadata: Readonly<Record<string, MetadataValue>>;
  readonly summary?: string;
  readonly identities: readonly Identity[];
}

/**
 * Provenance recorded for every model call (rule 12). Stores a redacted input
 * summary, the output, the prompt and rubric versions, the model adapter, and a
 * timestamp. The human reviewer's decision trail is recorded separately, later
 * in the review workflow.
 */
export interface CallProvenance {
  readonly promptVersion: string;
  readonly rubricVersion: string;
  readonly modelAdapter: string;
  readonly adapterLocation: AdapterLocation;
  /** Redacted, structural summary of what was sent — never raw input. */
  readonly inputSummary: string;
  readonly output: string;
  readonly timestamp: string;
}

/** The result of an AI review: the model output plus its call provenance. */
export interface AiReviewOutcome {
  readonly result: InferenceResult;
  readonly provenance: CallProvenance;
}

/** Limits enforced by the data-minimization guard. */
export interface MinimizationLimits {
  readonly maxExcerpts: number;
  readonly maxExcerptChars: number;
  readonly maxSummaryChars: number;
  readonly maxTotalChars: number;
}
