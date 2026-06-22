import type { Role } from "@eqa/auth";
import { loadBundledCatalog } from "@eqa/content";
import type { JobHandlerMap } from "@eqa/jobs";
import {
  HUMAN_REVIEW_JOB,
  RECORD_CONFORMANCE_JOB,
  REMEDIATION_TRANSITION_JOB,
  ASSIGN_REMEDIATION_JOB,
  SUBMIT_RESPONSE_JOB,
  UPDATE_REMEDIATION_PLAN_JOB,
  type ActingUserRef,
  type HumanReviewJobPayload,
  type RecordConformanceJobPayload,
  type AssignRemediationJobPayload,
  type RemediationTransitionJobPayload,
  type UpdateRemediationPlanJobPayload,
  type SubmitResponseJobPayload,
  WorkingPaperReviewEngine,
  resolveAssignRemediation,
} from "@eqa/workflows";
import type { TenantContext } from "@eqa/tenant";
import type { Database } from "./database";
import { createTenantRepositories } from "./repositories";

function sessionFromUser(
  tenant: TenantContext,
  user: ActingUserRef,
): {
  userId: string;
  tenant: TenantContext;
  role: Role;
  mfaAuthenticated: true;
} {
  return {
    userId: user.userId,
    tenant,
    role: user.role,
    mfaAuthenticated: true,
  };
}

/**
 * Job handlers for tenant-scoped UI mutations. Persistence runs inside the Step
 * 6.5 worker — HTTP handlers enqueue only (rule 10).
 */
export function createUiActionHandlers(db: Database): JobHandlerMap {
  const catalog = loadBundledCatalog();

  return {
    [SUBMIT_RESPONSE_JOB]: async (ctx) => {
      const payload = ctx.payload as SubmitResponseJobPayload;
      const repos = createTenantRepositories(
        db,
        sessionFromUser(ctx.tenant, payload),
      );
      await repos.responses.submit({
        assessmentId: payload.assessmentId,
        questionId: payload.questionId,
        answer: payload.answer,
        pin: payload.pin,
        ...(payload.note === undefined ? {} : { note: payload.note }),
      });
      return {
        assessmentId: payload.assessmentId,
        questionId: payload.questionId,
      };
    },

    [HUMAN_REVIEW_JOB]: async (ctx) => {
      const payload = ctx.payload as HumanReviewJobPayload;
      const repos = createTenantRepositories(
        db,
        sessionFromUser(ctx.tenant, payload),
      );
      const result = await repos.humanReview.applyReview({
        findingId: payload.findingId,
        action: payload.action,
        ...(payload.editedConclusion === undefined
          ? {}
          : { editedConclusion: payload.editedConclusion }),
      });
      return {
        findingId: payload.findingId,
        action: payload.action,
        finalConclusion: result.outcome.finalConclusion?.conclusion ?? null,
        itemStatus: result.finalItemStatus,
      };
    },

    [RECORD_CONFORMANCE_JOB]: async (ctx) => {
      const payload = ctx.payload as RecordConformanceJobPayload;
      const repos = createTenantRepositories(
        db,
        sessionFromUser(ctx.tenant, payload),
      );
      const engine = new WorkingPaperReviewEngine(
        repos.workingPaperReview,
        catalog,
      );
      await engine.recordConformance({
        checklistId: payload.checklistId,
        checklistItemId: payload.checklistItemId,
        conformance: payload.conformance,
        ...(payload.note === undefined ? {} : { note: payload.note }),
      });
      return {
        checklistId: payload.checklistId,
        checklistItemId: payload.checklistItemId,
        conformance: payload.conformance,
      };
    },

    [ASSIGN_REMEDIATION_JOB]: async (ctx) => {
      const payload = ctx.payload as AssignRemediationJobPayload;
      const repos = createTenantRepositories(
        db,
        sessionFromUser(ctx.tenant, payload),
      );
      const item = await repos.remediation.assign({
        assessmentId: payload.assessmentId,
        questionId: payload.questionId,
        standardNumber: payload.standardNumber,
        action: payload.action,
        owner: payload.owner,
        targetDate: payload.targetDate,
      });
      const current = await repos.itemStatus.getStatus(
        item.assessmentId,
        item.questionId,
      );
      return {
        remediationId: item.remediationId,
        itemStatus: current?.status ?? "not_assessed",
      };
    },

    [REMEDIATION_TRANSITION_JOB]: async (ctx) => {
      const payload = ctx.payload as RemediationTransitionJobPayload;
      const repos = createTenantRepositories(
        db,
        sessionFromUser(ctx.tenant, payload),
      );
      let itemStatus: string;

      switch (payload.transition) {
        case "start": {
          const item = await repos.remediation.getById(payload.remediationId);
          if (!item) {
            throw new Error(`Remediation '${payload.remediationId}' not found.`);
          }
          const current = await repos.itemStatus.getStatus(
            item.assessmentId,
            item.questionId,
          );
          const from = current?.status ?? "not_assessed";
          const transition = resolveAssignRemediation(from);
          await repos.itemStatus.transition({
            assessmentId: item.assessmentId,
            questionId: item.questionId,
            to: transition.to,
          });
          itemStatus = transition.to;
          break;
        }
        case "ready": {
          const item = await repos.remediation.markReadyForRetest(
            payload.remediationId,
          );
          const current = await repos.itemStatus.getStatus(
            item.assessmentId,
            item.questionId,
          );
          itemStatus = current?.status ?? "not_assessed";
          break;
        }
        case "pass": {
          const item = await repos.remediation.recordRetestPass(
            payload.remediationId,
          );
          const current = await repos.itemStatus.getStatus(
            item.assessmentId,
            item.questionId,
          );
          itemStatus = current?.status ?? "not_assessed";
          break;
        }
        case "fail": {
          const item = await repos.remediation.recordRetestFail(
            payload.remediationId,
            payload.retestNote,
          );
          const current = await repos.itemStatus.getStatus(
            item.assessmentId,
            item.questionId,
          );
          itemStatus = current?.status ?? "not_assessed";
          break;
        }
        default: {
          const unknown: never = payload.transition;
          throw new Error(`Unknown remediation transition '${unknown}'.`);
        }
      }

      return {
        remediationId: payload.remediationId,
        transition: payload.transition,
        itemStatus,
      };
    },

    [UPDATE_REMEDIATION_PLAN_JOB]: async (ctx) => {
      const payload = ctx.payload as UpdateRemediationPlanJobPayload;
      const repos = createTenantRepositories(
        db,
        sessionFromUser(ctx.tenant, payload),
      );
      const item = await repos.remediation.updatePlan({
        remediationId: payload.remediationId,
        ...(payload.owner === undefined ? {} : { owner: payload.owner }),
        ...(payload.action === undefined ? {} : { action: payload.action }),
        ...(payload.targetDate === undefined
          ? {}
          : { targetDate: payload.targetDate }),
      });
      const current = await repos.itemStatus.getStatus(
        item.assessmentId,
        item.questionId,
      );
      return {
        remediationId: item.remediationId,
        owner: item.owner,
        action: item.action,
        targetDate: item.targetDate,
        itemStatus: current?.status ?? "not_assessed",
      };
    },
  };
}
