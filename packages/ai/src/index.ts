/**
 * @eqa/ai
 *
 * Provider-agnostic AI inference layer. The model is swappable by config (local
 * stub now; in-Kingdom self-hosted adapter; future HUMAIN adapter) behind one
 * port — the same port/adapter pattern as storage and jobs. No vendor is
 * hardcoded, and client data must not leave Saudi Arabia.
 *
 * Hard rules enforced here:
 * - No external-API adapter is a usable path for client evidence (fails closed).
 * - Redaction guard: personal identifiers become role tokens before any text
 *   reaches the model.
 * - Data-minimization guard: only extracted excerpts, structured metadata, and
 *   redacted summaries reach the model — never raw evidence files.
 * - AI review runs as a tenant-scoped background job (@eqa/jobs), its outcome
 *   audited via the tenant job-audit port.
 * - Every model call records provenance (rule 12): redacted input summary,
 *   output, prompt version, rubric version, model adapter, and timestamp.
 *
 * The package holds no database dependency; concrete bindings (queue, audit
 * port, persistence) are composed where it is used.
 */

export {
  AiConfigError,
  AiError,
  DataMinimizationError,
  ExternalAdapterNotAllowedError,
  RedactionError,
} from "./errors";

export {
  assertEvidenceSafeAdapter,
  createModelAdapter,
  createModelAdapterFromEnv,
  InKingdomModelAdapter,
  LocalStubModelAdapter,
  type ModelAdapterConfig,
  type ModelAdapterDriver,
} from "./adapters";

export { redactNames, assertNoNames, roleToken } from "./redaction";
export type { RedactionResult } from "./redaction";

export {
  assertMinimized,
  DEFAULT_MINIMIZATION_LIMITS,
  summarizeRequest,
} from "./minimization";

export { AiReviewService, type AiReviewServiceOptions } from "./service";

export {
  AI_REVIEW_JOB,
  createAiReviewHandler,
  type AiReviewJobDeps,
  type AiReviewPayload,
} from "./review-job";

export type {
  AdapterLocation,
  AiReviewOutcome,
  CallProvenance,
  EvidenceReviewInput,
  Identity,
  InferenceClient,
  InferenceRequest,
  InferenceResult,
  MetadataValue,
  MinimizationLimits,
  ModelAdapter,
} from "./types";
