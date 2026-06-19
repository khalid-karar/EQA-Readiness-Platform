import type { Locale } from "@eqa/content";
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
