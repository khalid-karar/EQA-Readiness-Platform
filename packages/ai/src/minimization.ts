import { DataMinimizationError } from "./errors";
import type {
  EvidenceReviewInput,
  InferenceRequest,
  MinimizationLimits,
} from "./types";

/**
 * Default minimization limits. An excerpt is a short extracted passage, never a
 * whole document — so a raw file body (typically far larger) trips the per-excerpt
 * or total-character ceiling and is rejected before any model contact.
 */
export const DEFAULT_MINIMIZATION_LIMITS: MinimizationLimits = {
  maxExcerpts: 50,
  maxExcerptChars: 4_000,
  maxSummaryChars: 4_000,
  maxTotalChars: 60_000,
};

function isPrimitive(value: unknown): boolean {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

/**
 * The data-minimization guard. Throws {@link DataMinimizationError} unless the
 * input is limited to extracted excerpts, structured (primitive) metadata, and a
 * bounded redacted summary. This is what makes "raw evidence files never reach
 * the model by default" enforceable rather than assumed: non-string or oversized
 * excerpts (a raw file body), binary metadata, or an overlarge payload are all
 * rejected before inference.
 */
export function assertMinimized(
  input: EvidenceReviewInput,
  limits: MinimizationLimits = DEFAULT_MINIMIZATION_LIMITS,
): void {
  if (input.excerpts.length > limits.maxExcerpts) {
    throw new DataMinimizationError(
      `Too many excerpts (${input.excerpts.length} > ${limits.maxExcerpts}).`,
    );
  }

  let total = 0;
  for (const excerpt of input.excerpts) {
    if (typeof excerpt !== "string") {
      throw new DataMinimizationError(
        "Excerpts must be extracted text, not raw/binary content.",
      );
    }
    if (excerpt.length > limits.maxExcerptChars) {
      throw new DataMinimizationError(
        `An excerpt exceeds ${limits.maxExcerptChars} characters; only extracted ` +
          "excerpts (not whole files) may reach the model.",
      );
    }
    total += excerpt.length;
  }

  if (input.summary !== undefined) {
    if (typeof input.summary !== "string") {
      throw new DataMinimizationError("Summary must be redacted text.");
    }
    if (input.summary.length > limits.maxSummaryChars) {
      throw new DataMinimizationError(
        `Summary exceeds ${limits.maxSummaryChars} characters.`,
      );
    }
    total += input.summary.length;
  }

  for (const [key, value] of Object.entries(input.metadata)) {
    if (!isPrimitive(value)) {
      throw new DataMinimizationError(
        `Metadata field '${key}' must be a primitive (string/number/boolean), ` +
          "not raw or structured file content.",
      );
    }
  }

  if (total > limits.maxTotalChars) {
    throw new DataMinimizationError(
      `Total input (${total} chars) exceeds ${limits.maxTotalChars}.`,
    );
  }
}

/**
 * Builds the redacted, structural input summary recorded in call provenance. It
 * describes the shape of what was sent (counts, sizes, metadata keys) — never the
 * raw or personal content — so provenance is safe to persist and audit.
 */
export function summarizeRequest(request: InferenceRequest): string {
  const chars =
    request.excerpts.reduce((sum, e) => sum + e.length, 0) +
    (request.summary?.length ?? 0);
  const metaKeys = Object.keys(request.metadata).sort();
  return (
    `prompt=${request.promptVersion} rubric=${request.rubricVersion} ` +
    `excerpts=${request.excerpts.length} chars=${chars} ` +
    `summary=${request.summary ? "present" : "none"} ` +
    `metaKeys=[${metaKeys.join(",")}]`
  );
}
