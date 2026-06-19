import type { CallProvenance } from "@eqa/ai";
import type { ContentPin, Locale } from "@eqa/content";
import type { TenantContext } from "@eqa/tenant";
import type { DraftFinding, FinalConclusion } from "./findings";
import type { ItemStatus } from "./state-machine";

/**
 * The localized render model for the questionnaire. Produced from a content pack
 * for a chosen locale; it contains no business logic, only the content to show,
 * grouped Domain → Principle → Standard with the items to answer.
 */
export interface RubricLevelView {
  readonly level: number;
  readonly label: string;
  readonly descriptor: string;
}

export interface EvidencePromptView {
  readonly id: string;
  readonly text: string;
}

export interface ChecklistItemView {
  readonly id: string;
  readonly text: string;
}

/** A single answerable item (question) in the questionnaire. */
export interface QuestionView {
  readonly questionId: string;
  readonly text: string;
}

export interface StandardView {
  readonly number: string;
  readonly title: string;
  readonly questions: readonly QuestionView[];
  readonly evidencePrompts: readonly EvidencePromptView[];
  readonly rubric: readonly RubricLevelView[];
  readonly reviewChecklist: readonly ChecklistItemView[];
}

export interface PrincipleView {
  readonly id: string;
  readonly number: string;
  readonly title: string;
  readonly standards: readonly StandardView[];
}

export interface DomainView {
  readonly id: string;
  readonly number: string;
  readonly title: string;
  readonly principles: readonly PrincipleView[];
}

export interface QuestionnaireView {
  readonly contentPackId: string;
  readonly version: string;
  readonly locale: Locale;
  readonly domains: readonly DomainView[];
}

/**
 * The exact content snapshot a response was answered against — copied from the
 * assessment's {@link ContentPin}. Persisted with every response so an answer is
 * permanently tied to the content version (and content bytes) that produced it.
 */
export interface ResponsePin {
  readonly contentPackId: string;
  readonly version: string;
  readonly contentHash: string;
}

/** A response to submit for a single questionnaire item. */
export interface AssessmentResponseInput {
  readonly assessmentId: string;
  readonly questionId: string;
  readonly answer: string;
  readonly note?: string;
  readonly pin: ResponsePin;
}

/** A persisted response, including who answered it and when. */
export interface AssessmentResponse {
  readonly assessmentId: string;
  readonly questionId: string;
  readonly answer: string;
  readonly note: string | null;
  readonly pin: ResponsePin;
  readonly respondedBy: string;
  readonly respondedAt: string;
}

/**
 * Persistence port for responses. Implemented by the tenant-scoped, role-checked,
 * auto-audited repository in the data layer (@eqa/db), so the engine never
 * touches the database directly and cannot bypass tenant scoping, RBAC, or audit.
 */
export interface ResponseStore {
  submit(input: AssessmentResponseInput): Promise<void>;
  getForAssessment(assessmentId: string): Promise<AssessmentResponse[]>;
}

/**
 * The current status of a single assessment item (one standard/question),
 * together with who last moved it and when. An item with no record yet is at the
 * initial {@link INITIAL_ITEM_STATUS} (`not_assessed`).
 */
export interface ItemStatusRecord {
  readonly assessmentId: string;
  readonly questionId: string;
  readonly status: ItemStatus;
  readonly updatedBy: string;
  readonly updatedAt: string;
}

/** A request to move one item to a new status. */
export interface ItemStatusTransitionInput {
  readonly assessmentId: string;
  readonly questionId: string;
  readonly to: ItemStatus;
}

/**
 * Persistence port for item status. Implemented by the tenant-scoped,
 * role-checked, auto-audited repository in the data layer (@eqa/db). The adapter
 * applies the pure state-machine rules ({@link assertTransition}) before writing,
 * so an illegal transition is rejected at the data layer and every legal
 * transition is recorded in the audit log automatically. This mirrors the
 * port/adapter split used by the questionnaire engine's {@link ResponseStore}.
 */
export interface ItemStatusStore {
  /** The item's current status record, or `null` if it has never been moved. */
  getStatus(
    assessmentId: string,
    questionId: string,
  ): Promise<ItemStatusRecord | null>;
  /** Applies a legal transition and returns the resulting record. */
  transition(input: ItemStatusTransitionInput): Promise<ItemStatusRecord>;
  /** All item status records for an assessment, ordered by question. */
  getForAssessment(assessmentId: string): Promise<ItemStatusRecord[]>;
}

/**
 * The data-layer sink for a produced AI draft finding. Implemented in @eqa/db as
 * a tenant-scoped, system-audited writer: it persists the draft finding AND moves
 * the item to `ai_flagged` via the state machine ({@link assertTransition}),
 * both recorded in the tenant's immutable audit log. It is system-side (the AI
 * job is not a user) but still tenant-isolated and audited, mirroring the
 * malware-scan status writer. Keeping it a port lets the gap-flagging job stay
 * free of any database dependency.
 */
export interface GapFlagSink {
  /**
   * Persists the draft finding and transitions the item to `ai_flagged`. The
   * transition is validated against the state machine, so it fails closed if the
   * item is not in a status from which `ai_flagged` is reachable.
   */
  recordDraftFinding(
    tenant: TenantContext,
    finding: DraftFinding,
  ): Promise<void>;
}

/**
 * Read port for persisted draft findings. Implemented by the tenant-scoped,
 * role-checked repository in @eqa/db. Findings come back typed as
 * {@link DraftFinding} (always draft), so a reader cannot mistake one for a final
 * conclusion.
 */
export interface DraftFindingReader {
  getForAssessment(assessmentId: string): Promise<DraftFinding[]>;
  /** Loads one persisted draft by id; returns null if not found. */
  getById(findingId: string): Promise<DraftFinding | null>;
}

/** The actions an authorized reviewer may take on an AI draft finding. */
export const REVIEW_ACTIONS = ["accept", "reject", "edit_accept"] as const;
export type ReviewAction = (typeof REVIEW_ACTIONS)[number];

/**
 * The resolved outcome of a human review before persistence. Carries the
 * decision trail fields (original draft, any edits, provenance, content pin) and
 * the status path the item must follow through the Step 8 state machine.
 */
export interface HumanReviewOutcome {
  readonly action: ReviewAction;
  readonly assessmentId: string;
  readonly questionId: string;
  readonly standardNumber: string;
  readonly originalDraftSummary: string;
  /** Non-null only for `edit_accept`. */
  readonly editedText: string | null;
  /** Null when the reviewer dismisses the draft (`reject`). */
  readonly finalConclusion: FinalConclusion | null;
  /** Rule-12 provenance from the AI draft under review. */
  readonly provenance: CallProvenance;
  /** Content pin tying the decision to the exact rubric version. */
  readonly contentPin: ContentPin;
  /**
   * Statuses applied after the initial `ai_flagged → under_human_review` move:
   * always `[under_human_review, gap_confirmed]` or
   * `[under_human_review, reviewed_no_gap]`.
   */
  readonly statusPath: readonly [ItemStatus, ItemStatus];
}

/** A reviewer's action on one AI draft finding. */
export interface HumanReviewInput {
  readonly findingId: string;
  readonly action: ReviewAction;
  /** Required when action is `edit_accept`. */
  readonly editedConclusion?: string;
}

/** The result of a completed human review. */
export interface HumanReviewResult {
  readonly outcome: HumanReviewOutcome;
  readonly finalItemStatus: ItemStatus;
}

/**
 * Persistence port for the human reviewer workflow. Implemented by the
 * tenant-scoped, role-checked, auto-audited repository in @eqa/db. This is the
 * ONLY path that persists a {@link FinalConclusion} — no other store method
 * constructs or writes one.
 */
export interface HumanReviewStore {
  applyReview(input: HumanReviewInput): Promise<HumanReviewResult>;
}

/**
 * Read port for human-owned final conclusions. Implemented by the tenant-scoped
 * repository in @eqa/db. Only conclusions produced through
 * {@link HumanReviewStore} are returned.
 */
export interface FinalConclusionReader {
  getForAssessment(assessmentId: string): Promise<FinalConclusion[]>;
}
