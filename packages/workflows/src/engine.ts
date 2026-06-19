import type { ContentPack, ContentPin, Locale } from "@eqa/content";
import { PinContentMismatchError, UnknownQuestionError } from "./errors";
import { renderQuestionnaire } from "./render";
import type {
  AssessmentResponse,
  AssessmentResponseInput,
  QuestionnaireView,
  ResponsePin,
  ResponseStore,
} from "./types";

function collectQuestionIds(pack: ContentPack): Set<string> {
  const ids = new Set<string>();
  for (const domain of pack.domains) {
    for (const principle of domain.principles) {
      for (const standard of principle.standards) {
        for (const question of standard.questions) {
          ids.add(question.id);
        }
      }
    }
  }
  return ids;
}

/**
 * The questionnaire engine for a single assessment. It renders the content pack
 * the assessment is pinned to (in either locale) and captures responses through
 * the injected {@link ResponseStore} (the tenant-scoped, role-checked,
 * auto-audited repository).
 *
 * The engine is constructed with the assessment's {@link ContentPin} and the
 * matching pack; every response it submits carries that pin, so each answer is
 * permanently tied to the exact content version and bytes that produced it. A
 * later content version can never retroactively change a past response.
 */
export class QuestionnaireEngine {
  private readonly questionIds: Set<string>;

  constructor(
    private readonly pack: ContentPack,
    private readonly pin: ContentPin,
    private readonly store: ResponseStore,
  ) {
    if (
      pin.contentPackId !== pack.meta.contentPackId ||
      pin.version !== pack.meta.version ||
      pin.contentHash !== pack.contentHash
    ) {
      throw new PinContentMismatchError(
        `Assessment pin (${pin.contentPackId}@${pin.version}) does not match the ` +
          `supplied content pack (${pack.meta.contentPackId}@${pack.meta.version}).`,
      );
    }
    this.questionIds = collectQuestionIds(pack);
  }

  /** Renders the questionnaire in the requested locale. */
  render(locale: Locale): QuestionnaireView {
    return renderQuestionnaire(this.pack, locale);
  }

  /** Submits a response for a question, tagged with the assessment's content pin. */
  async answer(
    questionId: string,
    answer: string,
    note?: string,
  ): Promise<void> {
    if (!this.questionIds.has(questionId)) {
      throw new UnknownQuestionError(
        `Question '${questionId}' is not part of content pack ` +
          `'${this.pack.meta.contentPackId}@${this.pack.meta.version}'.`,
      );
    }
    const pinRef: ResponsePin = {
      contentPackId: this.pin.contentPackId,
      version: this.pin.version,
      contentHash: this.pin.contentHash,
    };
    const input: AssessmentResponseInput =
      note === undefined
        ? {
            assessmentId: this.pin.assessmentId,
            questionId,
            answer,
            pin: pinRef,
          }
        : {
            assessmentId: this.pin.assessmentId,
            questionId,
            answer,
            note,
            pin: pinRef,
          };
    await this.store.submit(input);
  }

  /** Lists the responses captured so far for this assessment. */
  responses(): Promise<AssessmentResponse[]> {
    return this.store.getForAssessment(this.pin.assessmentId);
  }
}
