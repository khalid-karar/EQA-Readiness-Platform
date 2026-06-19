/**
 * @eqa/workflows
 *
 * The questionnaire engine. Renders the assessment dynamically from the content
 * model (Domain → Principle → Standard) in English or Arabic, and captures the
 * tenant's responses per item.
 *
 * The engine never touches the database directly: it persists responses through
 * an injected {@link ResponseStore} (the tenant-scoped, role-checked,
 * auto-audited repository from @eqa/db). Every response carries the assessment's
 * content pin, tying each answer to the exact content version that produced it.
 */

export { renderQuestionnaire } from "./render";
export { QuestionnaireEngine } from "./engine";
export {
  ChecklistItemNotFoundError,
  ChecklistNotFoundError,
  EngagementNotCompletedError,
  EngagementNotFoundError,
  IllegalRemediationStateError,
  IllegalStatusTransitionError,
  DraftAlreadyReviewedError,
  DraftFindingNotFoundError,
  IllegalReviewStateError,
  InvalidRemediationInputError,
  InvalidReviewInputError,
  NotFormalAssessmentResultError,
  NotFinalConclusionError,
  PinContentMismatchError,
  RemediationAlreadyExistsError,
  RemediationNotFoundError,
  StandardNotInContentError,
  UnknownItemStatusError,
  UnknownQuestionError,
  WorkflowError,
} from "./errors";
export {
  assertFinalConclusion,
  isDraftFinding,
  isFinalConclusion,
  type DraftFinding,
  type FinalConclusion,
  type Finding,
  type FindingKind,
} from "./findings";
export {
  buildGapReviewInput,
  GAP_FLAG_PROMPT_VERSION,
  GapFlaggingEngine,
  type GapFlaggingEngineOptions,
  type GapFlagEvidence,
  type GapFlagRequest,
} from "./gap-flagging";
export {
  AI_GAP_FLAG_JOB,
  createGapFlaggingHandler,
  type GapFlaggingPayload,
  type GapFlagJobDeps,
} from "./gap-flag-job";
export { HumanReviewEngine, resolveHumanReview } from "./human-review";
export {
  buildRemediationTrackerView,
  daysOverdue,
  isRemediationOverdue,
  RemediationEngine,
  resolveAssignRemediation,
  resolveReadyForRetest,
  resolveRetestFail,
  resolveRetestPass,
  type AssignRemediationInput,
  type BuildRemediationTrackerInput,
  type RemediationItem,
  type RemediationPendingAction,
  type RemediationStore,
  type RemediationTrackerRow,
  type RemediationTrackerView,
  type RemediationTransition,
  type UpdateRemediationInput,
} from "./remediation";
export { createSyntheticRemediationView } from "./synthetic-remediation";
export {
  assertFormalAssessmentResult,
  assertReadinessSimulation,
} from "./mock-eqa-assessment-result";
export {
  MOCK_EQA_SIMULATION_JOB,
  createMockEqaScoringHandler,
  type MockEqaScoringJobDeps,
  type MockEqaScoringLoader,
  type MockEqaSimulationPayload,
  type MockEqaSimulationSink,
} from "./mock-eqa-job";
export {
  buildMockEqaSimulationView,
  computeMockEqaSimulation,
  isFormalAssessmentResult,
  isReadinessSimulation,
  MOCK_EQA_DISCLAIMER,
  readinessRatingLabel,
  READINESS_SIMULATION_KIND,
  FORMAL_ASSESSMENT_RESULT_KIND,
  type AssessmentResult,
  type AssessmentResultKind,
  type DrivingGap,
  type DrivingGapSource,
  type FormalAssessmentResult,
  type MockEqaDomainRating,
  type MockEqaRating,
  type MockEqaScoringInput,
  type MockEqaSimulationResult,
  type MockEqaSimulationView,
  type MockEqaStandardRating,
} from "./mock-eqa-scoring";
export { createSyntheticMockEqaInput } from "./synthetic-mock-eqa";
export {
  aggregateEngagementConformance,
  buildChecklistReviewView,
  countConformance,
  WorkingPaperReviewEngine,
  type AuditFileWithPapers,
  type ChecklistItemReviewView,
  type ConformanceCounts,
  type EngagementConformanceSummary,
  type EngagementHierarchy,
  type RecordConformanceInput,
  type StandardConformanceSummary,
  type WorkingPaperReviewStore,
  type WorkingPaperReviewView,
  type WorkingPaperWithChecklists,
} from "./working-paper-review";
export {
  buildDashboardView,
  buildPendingActions,
  computeAssessmentProgress,
  computeOverallReadiness,
  computeStandardReadiness,
  isSummaryView,
  ROLE_LABELS,
  UX_STATUS_LABELS,
  uxStatusLabel,
  uxStatusLevel,
  type AssessmentProgress,
  type DashboardInput,
  type DashboardRole,
  type DashboardView,
  type HeatMapCell,
  type HeatMapDomain,
  type HeatMapPrinciple,
  type OverallReadiness,
  type PendingAction,
  type ReadinessLevel,
  type StandardPhase,
} from "./readiness-dashboard";
export { createSyntheticDashboardInput } from "./synthetic-dashboard";
export {
  allowedTransitions,
  assertItemStatus,
  assertTransition,
  canTransition,
  INITIAL_ITEM_STATUS,
  isItemStatus,
  isTerminalStatus,
  ITEM_STATUSES,
  STATUS_LABELS,
  type ItemStatus,
} from "./state-machine";
export type {
  AssessmentResponse,
  AssessmentResponseInput,
  ChecklistItemView,
  DomainView,
  DraftFindingReader,
  EvidencePromptView,
  FinalConclusionReader,
  GapFlagSink,
  HumanReviewInput,
  HumanReviewOutcome,
  HumanReviewResult,
  HumanReviewStore,
  ItemStatusRecord,
  ItemStatusStore,
  ItemStatusTransitionInput,
  PrincipleView,
  QuestionnaireView,
  QuestionView,
  ResponsePin,
  ResponseStore,
  REVIEW_ACTIONS,
  ReviewAction,
  RubricLevelView,
  StandardView,
} from "./types";
