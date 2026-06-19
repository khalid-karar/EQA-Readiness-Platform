import { type ContentPack, type Locale, localize } from "@eqa/content";
import type { QuestionnaireView } from "./types";

/**
 * Renders the questionnaire view from a content pack for a locale. Pure and
 * fully data-driven: the structure and every label come from the content, so
 * changing the seed file changes the questionnaire with no code change. Bilingual
 * fields are resolved via {@link localize}.
 */
export function renderQuestionnaire(
  pack: ContentPack,
  locale: Locale,
): QuestionnaireView {
  return {
    contentPackId: pack.meta.contentPackId,
    version: pack.meta.version,
    locale,
    domains: pack.domains.map((domain) => ({
      id: domain.id,
      number: domain.number,
      title: localize(domain.title, locale),
      principles: domain.principles.map((principle) => ({
        id: principle.id,
        number: principle.number,
        title: localize(principle.title, locale),
        standards: principle.standards.map((standard) => ({
          number: standard.number,
          title: localize(standard.title, locale),
          questions: standard.questions.map((question) => ({
            questionId: question.id,
            text: localize(question.text, locale),
          })),
          evidencePrompts: standard.evidencePrompts.map((prompt) => ({
            id: prompt.id,
            text: localize(prompt.text, locale),
          })),
          rubric: standard.rubric.levels.map((level) => ({
            level: level.level,
            label: localize(level.label, locale),
            descriptor: localize(level.descriptor, locale),
          })),
          reviewChecklist: standard.reviewChecklist.map((item) => ({
            id: item.id,
            text: localize(item.text, locale),
          })),
        })),
      })),
    })),
  };
}
