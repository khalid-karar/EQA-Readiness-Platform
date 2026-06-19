import type { JobHandler } from "@eqa/jobs";
import type { AiReviewService } from "./service";
import type { CallProvenance, EvidenceReviewInput } from "./types";

/** The job name under which the AI evidence-review handler is registered. */
export const AI_REVIEW_JOB = "ai:evidence-review";

/** Payload enqueued for an AI review — the minimized review input. */
export type AiReviewPayload = EvidenceReviewInput;

export interface AiReviewJobDeps {
  readonly service: AiReviewService;
}

/**
 * Builds the AI-review job handler. AI review never runs synchronously in a
 * request handler — it runs here, inside the Step 6.5 job framework's resolved
 * tenant context. The handler returns the call {@link CallProvenance}, which the
 * queue's audit port records through the tenant-scoped audit path, so every
 * model call's provenance is audited and tenant-isolated.
 */
export function createAiReviewHandler(deps: AiReviewJobDeps): JobHandler {
  return async (ctx): Promise<CallProvenance> => {
    const outcome = await deps.service.review(ctx.payload as AiReviewPayload);
    return outcome.provenance;
  };
}
