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
  countRemediationOverdue,
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
  buildEvidencePackManifest,
  EVIDENCE_PACK_CONFIDENTIALITY,
  EVIDENCE_PACK_KIND,
  isEvidencePackManifest,
  packStatusLabel,
  type EvidenceIndexEntry,
  type EvidenceMetadataForPack,
  type EvidencePackAssemblyInput,
  type EvidencePackFormat,
  type EvidencePackManifest,
  type EvidencePackReadinessSummary,
  type QuestionPackDetail,
  type StandardPackSection,
} from "./evidence-pack";
export {
  closeEvidencePackBrowser,
  evidencePackPdfSha256,
  PINNED_CHROMIUM_REVISION,
} from "./evidence-pack-pdf-chromium";
export {
  pdfContainsText,
  renderEvidencePackPdf,
  PACK_PDF_MARKERS,
  readPdfPackMetadata,
  verifyPdfPackCompliance,
} from "./evidence-pack-pdf";
export {
  defaultEvidencePackRenderer,
  EVIDENCE_PACK_EXPORT_JOB,
  createEvidencePackHandler,
  type EvidencePackExportPayload,
  type EvidencePackExportRecord,
  type EvidencePackJobDeps,
  type EvidencePackLoader,
  type EvidencePackRenderer,
  type EvidencePackSink,
} from "./evidence-pack-job";
export { createSyntheticEvidencePackInput } from "./synthetic-evidence-pack";
export {
  createSeeraDemoAssessmentName,
  createSeeraDemoConformanceByStandard,
  createSeeraDemoContentPin,
  createSeeraDemoDraftFindings,
  createSeeraDemoEvidenceMetadata,
  createSeeraDemoFinalConclusions,
  createSeeraDemoRemediationItems,
  createSeeraDemoResponses,
  createSeeraDemoStatusesByQuestion,
  createSeeraDemoWorkingPaperEngagement,
  SEERA_DEMO_ASSESSMENT_ID,
  SEERA_DEMO_JOURNEY_MOCK_EQA_STARTED,
  SEERA_DEMO_JOURNEY_PACK_STARTED,
  SEERA_DEMO_PACK_ID,
  SEERA_DEMO_PACK_VERSION,
  SEERA_DEMO_PENDING_REVIEW_COUNT,
  SEERA_DEMO_QUESTIONS,
  SEERA_DEMO_REFERENCE_DATE,
  SEERA_DEMO_RETEST_FAIL_NOTE,
  SEERA_DEMO_STANDARDS,
  type SeeraDemoWorkingPaperEngagement,
  type SeeraDemoWorkingPaperItem,
} from "./synthetic-seera-demo";
export {
  createMixedScriptTortureEvidencePackInput,
  MIXED_SCRIPT_TORTURE_CONTENT_HASH,
  MIXED_SCRIPT_TORTURE_GENERATED_AT,
  mixedScriptTortureMachineTokens,
} from "./synthetic-mixed-script-torture";
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
  SUBMIT_RESPONSE_JOB,
  HUMAN_REVIEW_JOB,
  RECORD_CONFORMANCE_JOB,
  REMEDIATION_TRANSITION_JOB,
  createSubmitResponseHandler,
  createHumanReviewHandler,
  createRecordConformanceHandler,
  createRemediationTransitionHandler,
  type ActingUserRef,
  type SubmitResponseJobPayload,
  type HumanReviewJobPayload,
  type RecordConformanceJobPayload,
  type RemediationTransitionJobPayload,
  type RemediationTransitionKind,
} from "./ui-action-jobs";
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
