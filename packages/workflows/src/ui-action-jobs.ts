import type { JobHandler } from "@eqa/jobs";
import type { Role } from "@eqa/auth";
import type {
  AssessmentResponseInput,
  HumanReviewInput,
  ReviewAction,
} from "./types";
import type { RecordConformanceInput } from "./working-paper-review";

/** Tenant-scoped UI mutation jobs (Step 6.5 — never synchronous in HTTP handlers). */
export const SUBMIT_RESPONSE_JOB = "workflow:submit-response";
export const HUMAN_REVIEW_JOB = "workflow:human-review";
export const RECORD_CONFORMANCE_JOB = "workflow:record-conformance";
export const REMEDIATION_TRANSITION_JOB = "workflow:remediation-transition";

export interface ActingUserRef {
  readonly userId: string;
  readonly role: Role;
}

export interface SubmitResponseJobPayload extends ActingUserRef {
  readonly assessmentId: string;
  readonly questionId: string;
  readonly answer: string;
  readonly note?: string;
  readonly pin: AssessmentResponseInput["pin"];
}

export interface HumanReviewJobPayload extends ActingUserRef {
  readonly findingId: string;
  readonly action: ReviewAction;
  readonly editedConclusion?: string;
}

export interface RecordConformanceJobPayload extends ActingUserRef {
  readonly checklistId: string;
  readonly checklistItemId: string;
  readonly conformance: RecordConformanceInput["conformance"];
  readonly note?: string;
}

export type RemediationTransitionKind = "start" | "ready" | "pass" | "fail";

export interface RemediationTransitionJobPayload extends ActingUserRef {
  readonly remediationId: string;
  readonly transition: RemediationTransitionKind;
  readonly retestNote?: string;
}

export interface SubmitResponseExecutor {
  submit(
    sessionUser: ActingUserRef,
    input: AssessmentResponseInput,
  ): Promise<void>;
}

export interface HumanReviewExecutor {
  applyReview(
    sessionUser: ActingUserRef,
    input: HumanReviewInput,
  ): Promise<{ finalConclusion: string | null; itemStatus: string }>;
}

export interface RecordConformanceExecutor {
  recordConformance(
    sessionUser: ActingUserRef,
    input: RecordConformanceInput,
  ): Promise<void>;
}

export interface RemediationTransitionExecutor {
  applyTransition(
    sessionUser: ActingUserRef,
    payload: RemediationTransitionJobPayload,
  ): Promise<{ itemStatus: string }>;
}

export function createSubmitResponseHandler(
  executor: SubmitResponseExecutor,
): JobHandler {
  return async (ctx) => {
    const payload = ctx.payload as SubmitResponseJobPayload;
    await executor.submit(
      { userId: payload.userId, role: payload.role },
      {
        assessmentId: payload.assessmentId,
        questionId: payload.questionId,
        answer: payload.answer,
        pin: payload.pin,
        ...(payload.note === undefined ? {} : { note: payload.note }),
      },
    );
    return {
      assessmentId: payload.assessmentId,
      questionId: payload.questionId,
    };
  };
}

export function createHumanReviewHandler(
  executor: HumanReviewExecutor,
): JobHandler {
  return async (ctx) => {
    const payload = ctx.payload as HumanReviewJobPayload;
    const result = await executor.applyReview(
      { userId: payload.userId, role: payload.role },
      {
        findingId: payload.findingId,
        action: payload.action,
        ...(payload.editedConclusion === undefined
          ? {}
          : { editedConclusion: payload.editedConclusion }),
      },
    );
    return {
      findingId: payload.findingId,
      action: payload.action,
      finalConclusion: result.finalConclusion,
      itemStatus: result.itemStatus,
    };
  };
}

export function createRecordConformanceHandler(
  executor: RecordConformanceExecutor,
): JobHandler {
  return async (ctx) => {
    const payload = ctx.payload as RecordConformanceJobPayload;
    await executor.recordConformance(
      { userId: payload.userId, role: payload.role },
      {
        checklistId: payload.checklistId,
        checklistItemId: payload.checklistItemId,
        conformance: payload.conformance,
        ...(payload.note === undefined ? {} : { note: payload.note }),
      },
    );
    return {
      checklistId: payload.checklistId,
      checklistItemId: payload.checklistItemId,
      conformance: payload.conformance,
    };
  };
}

export function createRemediationTransitionHandler(
  executor: RemediationTransitionExecutor,
): JobHandler {
  return async (ctx) => {
    const payload = ctx.payload as RemediationTransitionJobPayload;
    const result = await executor.applyTransition(
      { userId: payload.userId, role: payload.role },
      payload,
    );
    return {
      remediationId: payload.remediationId,
      transition: payload.transition,
      itemStatus: result.itemStatus,
    };
  };
}
