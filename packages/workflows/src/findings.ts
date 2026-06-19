import type { ContentPin } from "@eqa/content";
import type { CallProvenance } from "@eqa/ai";
import { NotFinalConclusionError } from "./errors";

/**
 * The kind discriminant that separates AI draft work product from a human-owned
 * final conclusion. They are distinct literal types so a draft can never be
 * passed where a final conclusion is required — the distinction is enforced by
 * the type system, not merely by convention.
 */
export type FindingKind = "draft_finding" | "final_conclusion";

/**
 * A gap finding drafted by the AI layer. It is, by type, draft work product
 * (rule 12) — never a conclusion:
 *
 * - `kind` is the literal `"draft_finding"` and `status` is `"draft"`, so it is
 *   structurally not a {@link FinalConclusion}.
 * - `requiresHumanReview` is the literal `true`: a draft always awaits human
 *   review before it can mean anything.
 * - It carries the full AI {@link CallProvenance} (prompt version, rubric
 *   version, model adapter, redacted input summary, output, timestamp) and the
 *   assessment's {@link ContentPin}, so the finding is permanently tied to the
 *   exact rubric/content version that produced it.
 *
 * There is deliberately NO function in this package that turns a `DraftFinding`
 * into a {@link FinalConclusion}: promotion happens only through the Step 11
 * human-review workflow. {@link assertFinalConclusion} rejects a draft at
 * runtime, so a draft can be neither read nor coerced as a final conclusion.
 */
export interface DraftFinding {
  readonly kind: "draft_finding";
  readonly status: "draft";
  readonly assessmentId: string;
  readonly questionId: string;
  /** The standard (by structural number) this finding was drafted against. */
  readonly standardNumber: string;
  /** The AI's draft narrative — draft work product only, never a conclusion. */
  readonly draftSummary: string;
  /** Rule-12 provenance: prompt/rubric version, model adapter, input summary, output, timestamp. */
  readonly provenance: CallProvenance;
  /** Ties the finding to the exact content/rubric version that produced it. */
  readonly contentPin: ContentPin;
  /** Always `true`: an AI draft must be human-reviewed before it can become final. */
  readonly requiresHumanReview: true;
}

/**
 * A human-owned final conclusion about an assessment item. It is the contrasting
 * type to {@link DraftFinding}: distinct `kind`, no `requiresHumanReview` escape
 * hatch. This package never constructs one — a final conclusion is produced only
 * by the Step 11 human-review workflow, which records the reviewer's decision
 * trail. Defining it here makes the "draft vs final" boundary explicit in the
 * type system so downstream code can demand a final conclusion and have a draft
 * rejected.
 */
export interface FinalConclusion {
  readonly kind: "final_conclusion";
  readonly assessmentId: string;
  readonly questionId: string;
  readonly standardNumber: string;
  readonly conclusion: string;
}

/** A finding is either an AI draft or a human-owned final conclusion. */
export type Finding = DraftFinding | FinalConclusion;

/** True if `value` is a {@link DraftFinding}. */
export function isDraftFinding(value: unknown): value is DraftFinding {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { kind?: unknown }).kind === "draft_finding"
  );
}

/** True if `value` is a {@link FinalConclusion}. */
export function isFinalConclusion(value: unknown): value is FinalConclusion {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { kind?: unknown }).kind === "final_conclusion"
  );
}

/**
 * Narrows `value` to {@link FinalConclusion} or throws
 * {@link NotFinalConclusionError}. This is how downstream code "demands a final
 * conclusion": a {@link DraftFinding} fails the check, so an AI draft can never
 * be treated as — or promoted to — a final conclusion without first going
 * through the Step 11 human-review workflow that produces a real
 * {@link FinalConclusion}.
 */
export function assertFinalConclusion(
  value: unknown,
): asserts value is FinalConclusion {
  if (!isFinalConclusion(value)) {
    throw new NotFinalConclusionError(
      "Refusing to treat this value as a final conclusion. AI gap findings are " +
        "draft work product and become final only through human review (Step 11).",
    );
  }
}
