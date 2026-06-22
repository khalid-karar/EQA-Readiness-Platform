import type { Role } from "@eqa/auth";
import { AiReviewService, createModelAdapterFromEnv } from "@eqa/ai";
import { loadBundledCatalog } from "@eqa/content";
import {
  createGapFlagSink,
  createTenantRepositories,
  type Database,
} from "@eqa/db";
import type { JobHandlerMap } from "@eqa/jobs";
import {
  AI_GAP_FLAG_JOB,
  GapFlaggingEngine,
  canTransition,
  createGapFlaggingHandler,
  type GapFlaggingPayload,
  type ItemStatus,
} from "@eqa/workflows";

const PRE_GAP_STATUSES: readonly ItemStatus[] = [
  "evidence_requested",
  "evidence_submitted",
];

/**
 * Registers the Step 10 gap-flag job for the web app queue. Wraps the existing
 * {@link createGapFlaggingHandler} with legal pre-transitions to
 * `evidence_submitted` when clean linked evidence exists.
 */
export function getGapFlagJobHandlers(db: Database): JobHandlerMap {
  const catalog = loadBundledCatalog();
  const adapter = createModelAdapterFromEnv();
  const engine = new GapFlaggingEngine(new AiReviewService(adapter));
  const inner = createGapFlaggingHandler({
    engine,
    catalog,
    sink: createGapFlagSink(db),
  });

  return {
    [AI_GAP_FLAG_JOB]: async (ctx) => {
      const payload = ctx.payload as GapFlaggingPayload & {
        userId: string;
        role: Role;
      };
      const repos = createTenantRepositories(db, {
        userId: payload.userId,
        role: payload.role,
        tenant: ctx.tenant,
        mfaAuthenticated: true,
      });
      const assessmentId = payload.pin.assessmentId;
      let status =
        (
          await repos.itemStatus.getStatus(assessmentId, payload.questionId)
        )?.status ?? "not_assessed";

      for (const target of PRE_GAP_STATUSES) {
        if (canTransition(status, target)) {
          await repos.itemStatus.transition({
            assessmentId,
            questionId: payload.questionId,
            to: target,
          });
          status = target;
        }
      }

      await inner(ctx);

      const drafts =
        await repos.draftFindings.getForAssessment(assessmentId);
      const draft = drafts.find((d) => d.questionId === payload.questionId);
      const itemStatus = (
        await repos.itemStatus.getStatus(assessmentId, payload.questionId)
      )?.status;

      return {
        findingId: draft?.findingId ?? null,
        draftSummary: draft?.draftSummary ?? null,
        itemStatus: itemStatus ?? "ai_flagged",
      };
    },
  };
}
