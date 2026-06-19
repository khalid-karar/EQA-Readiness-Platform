import type { Locale } from "@eqa/content";

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
