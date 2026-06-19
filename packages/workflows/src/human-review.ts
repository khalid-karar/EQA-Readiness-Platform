import { InvalidReviewInputError } from "./errors";
import type { DraftFinding, FinalConclusion } from "./findings";
import type {
  HumanReviewInput,
  HumanReviewOutcome,
  HumanReviewResult,
  HumanReviewStore,
  ReviewAction,
} from "./types";

/**
 * The ONLY function in the codebase that constructs a {@link FinalConclusion}.
 * Called exclusively from {@link resolveHumanReview} when the reviewer accepts
 * or edit-accepts a draft — there is no other promotion path from Step 10.
 */
function createFinalConclusion(
  draft: DraftFinding,
  conclusion: string,
): FinalConclusion {
  return {
    kind: "final_conclusion",
    assessmentId: draft.assessmentId,
    questionId: draft.questionId,
    standardNumber: draft.standardNumber,
    conclusion,
  };
}

/**
 * Pure resolution of a reviewer's action against an AI draft. Determines the
 * {@link FinalConclusion} (if any), the edited text (if any), and the legal
 * status path through the state machine. Throws on invalid input; does not
 * touch persistence.
 */
export function resolveHumanReview(
  draft: DraftFinding,
  action: ReviewAction,
  editedConclusion?: string,
): HumanReviewOutcome {
  const base = {
    action,
    assessmentId: draft.assessmentId,
    questionId: draft.questionId,
    standardNumber: draft.standardNumber,
    originalDraftSummary: draft.draftSummary,
    editedText: null as string | null,
    provenance: draft.provenance,
    contentPin: draft.contentPin,
  };

  switch (action) {
    case "accept":
      return {
        ...base,
        finalConclusion: createFinalConclusion(draft, draft.draftSummary),
        statusPath: ["under_human_review", "gap_confirmed"],
      };
    case "reject":
      return {
        ...base,
        finalConclusion: null,
        statusPath: ["under_human_review", "reviewed_no_gap"],
      };
    case "edit_accept": {
      const edited = editedConclusion?.trim();
      if (!edited) {
        throw new InvalidReviewInputError(
          "edit_accept requires a non-empty editedConclusion.",
        );
      }
      return {
        ...base,
        editedText: edited,
        finalConclusion: createFinalConclusion(draft, edited),
        statusPath: ["under_human_review", "gap_confirmed"],
      };
    }
    default: {
      const unknown: never = action;
      throw new InvalidReviewInputError(`Unknown review action '${unknown}'.`);
    }
  }
}

/**
 * The human reviewer workflow — the only path by which an AI draft finding
 * becomes a {@link FinalConclusion}. An authorized reviewer (CAE or Audit Staff;
 * Board is read-only and cannot call the store) acts on a Step 10 draft with
 * accept, reject, or edit-then-accept.
 *
 * The engine is pure with respect to the data layer: it delegates persistence,
 * RBAC, status transitions, and audit logging to the injected
 * {@link HumanReviewStore} (implemented in @eqa/db). The store applies the
 * resolved outcome: first `ai_flagged → under_human_review`, then the outcome
 * transition, recording the full decision trail in the immutable audit log.
 */
export class HumanReviewEngine {
  constructor(private readonly store: HumanReviewStore) {}

  async review(input: HumanReviewInput): Promise<HumanReviewResult> {
    return this.store.applyReview(input);
  }
}
