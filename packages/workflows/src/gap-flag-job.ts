import type { JobHandler } from "@eqa/jobs";
import {
  type ContentCatalog,
  type ContentPack,
  type ContentPin,
  type Locale,
  type Standard,
} from "@eqa/content";
import { StandardNotInContentError } from "./errors";
import type { CallProvenance } from "@eqa/ai";
import type { GapFlaggingEngine, GapFlagEvidence } from "./gap-flagging";
import type { GapFlagSink } from "./types";

/** The job name under which the AI gap-flagging handler is registered. */
export const AI_GAP_FLAG_JOB = "ai:gap-flag";

/**
 * Payload enqueued for a gap-flagging run. It carries the content pin (so the
 * exact pinned rubric is resolved, never "latest"), the standard to compare
 * against, the item, and the minimized evidence to review.
 */
export interface GapFlaggingPayload {
  readonly questionId: string;
  readonly standardNumber: string;
  readonly pin: ContentPin;
  readonly evidence: GapFlagEvidence;
  readonly locale?: Locale;
}

export interface GapFlagJobDeps {
  /** The pure engine that runs the Step 9 comparison and drafts the finding. */
  readonly engine: GapFlaggingEngine;
  /** Resolves the pinned content pack to read the standard's authored rubric. */
  readonly catalog: ContentCatalog;
  /** The data-layer sink that persists the draft and flips status to AI Flagged. */
  readonly sink: GapFlagSink;
}

function findStandard(
  pack: ContentPack,
  standardNumber: string,
): Standard | undefined {
  for (const domain of pack.domains) {
    for (const principle of domain.principles) {
      for (const standard of principle.standards) {
        if (standard.number === standardNumber) return standard;
      }
    }
  }
  return undefined;
}

/**
 * Builds the gap-flagging job handler. The comparison never runs synchronously
 * in a request handler — it runs here, inside the Step 6.5 job framework's
 * resolved tenant context, and through the Step 9 inference layer (so redaction,
 * minimization, no-external-path, and provenance all apply).
 *
 * The handler:
 *  1. resolves the EXACT pinned content (Step 5) and reads the standard's rubric;
 *  2. drafts the finding via the engine (Step 9) — draft work product only;
 *  3. hands the draft to the data layer, which persists it and moves the item to
 *     `ai_flagged` (Step 8) — both tenant-scoped and audited.
 *
 * It returns the AI call {@link CallProvenance}, which the queue's audit port
 * records through the tenant-scoped audit path, so every model call is audited
 * and tenant-isolated.
 */
export function createGapFlaggingHandler(deps: GapFlagJobDeps): JobHandler {
  return async (ctx): Promise<CallProvenance> => {
    const payload = ctx.payload as GapFlaggingPayload;

    // Resolve the exact pinned content (fails closed on any hash divergence),
    // then locate the standard whose rubric we compare evidence against.
    const pack = deps.catalog.resolvePin(payload.pin);
    const standard = findStandard(pack, payload.standardNumber);
    if (!standard) {
      throw new StandardNotInContentError(
        `Standard '${payload.standardNumber}' is not present in pinned content ` +
          `'${payload.pin.contentPackId}@${payload.pin.version}'.`,
      );
    }

    const draft = await deps.engine.flag({
      questionId: payload.questionId,
      pin: payload.pin,
      standard,
      evidence: payload.evidence,
      ...(payload.locale === undefined ? {} : { locale: payload.locale }),
    });

    // Persistence + the status transition to AI Flagged live in @eqa/db.
    await deps.sink.recordDraftFinding(ctx.tenant, draft);

    return draft.provenance;
  };
}
