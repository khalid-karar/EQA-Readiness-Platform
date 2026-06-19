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
  PinContentMismatchError,
  UnknownQuestionError,
  WorkflowError,
} from "./errors";
export type {
  AssessmentResponse,
  AssessmentResponseInput,
  ChecklistItemView,
  DomainView,
  EvidencePromptView,
  PrincipleView,
  QuestionnaireView,
  QuestionView,
  ResponsePin,
  ResponseStore,
  RubricLevelView,
  StandardView,
} from "./types";
