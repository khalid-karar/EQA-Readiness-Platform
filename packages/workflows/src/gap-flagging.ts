import type { AiReviewService, EvidenceReviewInput, Identity } from "@eqa/ai";
import {
  localize,
  type ContentPin,
  type Locale,
  type Standard,
} from "@eqa/content";
import type { DraftFinding } from "./findings";

/**
 * The versioned prompt template the gap-flagging engine uses to ask the model to
 * compare evidence against a rubric. Versioned (rule 12) so every draft finding
 * records exactly which prompt produced it; bump this when the prompt changes.
 */
export const GAP_FLAG_PROMPT_VERSION = "gap-flag@1.0.0";

/**
 * The already-extracted, structured evidence the engine compares against a
 * rubric. By construction this is minimized material only — extracted excerpts,
 * an optional redacted summary, and the identities to redact — never raw files.
 * The Step 9 inference layer enforces redaction and minimization on top of this.
 */
export interface GapFlagEvidence {
  /** Extracted text excerpts from the tenant's submitted evidence. */
  readonly excerpts: readonly string[];
  /** Optional pre-extracted summary of the evidence. */
  readonly summary?: string;
  /** People whose names are redacted to role tokens before any model contact. */
  readonly identities: readonly Identity[];
}

/** A request to draft a gap finding for one assessment item. */
export interface GapFlagRequest {
  /** The questionnaire item the finding is about. */
  readonly questionId: string;
  /** The assessment's content pin — ties the finding to the exact rubric version. */
  readonly pin: ContentPin;
  /** The standard (with its authored rubric) to compare evidence against. */
  readonly standard: Standard;
  readonly evidence: GapFlagEvidence;
  /** Locale used to render the rubric text sent to the model. Defaults to English. */
  readonly locale?: Locale;
}

/**
 * Builds the Step 9 {@link EvidenceReviewInput} for a gap comparison. The
 * authored rubric levels (non-personal content) are passed as labelled excerpts
 * so the model has the criteria to compare against, alongside the tenant's
 * evidence excerpts. The rubric version is taken from the content pin, so the
 * recorded provenance is tied to the exact content version. The actual
 * comparison instructions live in the versioned prompt identified by
 * `promptVersion`, not hardcoded here.
 */
export function buildGapReviewInput(
  request: GapFlagRequest,
  promptVersion: string,
): EvidenceReviewInput {
  const locale: Locale = request.locale ?? "en";
  const rubricExcerpts = request.standard.rubric.levels.map(
    (level) =>
      `RUBRIC L${level.level} ${localize(level.label, locale)}: ${localize(
        level.descriptor,
        locale,
      )}`,
  );
  return {
    promptVersion,
    // The rubric lives in the pinned content version; tie provenance to it.
    rubricVersion: request.pin.version,
    excerpts: [...rubricExcerpts, ...request.evidence.excerpts],
    metadata: {
      standardNumber: request.standard.number,
      standardTitle: localize(request.standard.title, locale),
      rubricLevels: request.standard.rubric.levels.length,
      contentPackId: request.pin.contentPackId,
      contentVersion: request.pin.version,
    },
    identities: request.evidence.identities,
    ...(request.evidence.summary === undefined
      ? {}
      : { summary: request.evidence.summary }),
  };
}

export interface GapFlaggingEngineOptions {
  /** Override the prompt version (defaults to {@link GAP_FLAG_PROMPT_VERSION}). */
  readonly promptVersion?: string;
}

/**
 * The AI gap-flagging engine. It compares a tenant's submitted evidence against
 * the authored rubric for a standard, via the Step 9 inference layer, and emits a
 * {@link DraftFinding} — explicitly draft work product, never a final conclusion.
 *
 * The engine is pure with respect to the data layer: it has no database
 * dependency and performs no persistence or status transition. Routing the
 * comparison through the injected {@link AiReviewService} means redaction,
 * data-minimization, the no-external-path rule, and provenance (rule 12) all
 * apply automatically. Persistence and the status transition to `ai_flagged` are
 * the data layer's responsibility (the {@link GapFlagSink} adapter in @eqa/db),
 * same port/adapter split as the questionnaire engine.
 */
export class GapFlaggingEngine {
  private readonly promptVersion: string;

  constructor(
    private readonly review: AiReviewService,
    options: GapFlaggingEngineOptions = {},
  ) {
    this.promptVersion = options.promptVersion ?? GAP_FLAG_PROMPT_VERSION;
  }

  /**
   * Drafts a gap finding for one item. The returned value is, by type, a draft
   * (`kind: "draft_finding"`, `requiresHumanReview: true`) and carries the AI
   * call provenance (prompt + rubric version + model adapter) and the content
   * pin. It is never a final conclusion.
   */
  async flag(request: GapFlagRequest): Promise<DraftFinding> {
    const input = buildGapReviewInput(request, this.promptVersion);
    const outcome = await this.review.review(input);
    return {
      kind: "draft_finding",
      status: "draft",
      assessmentId: request.pin.assessmentId,
      questionId: request.questionId,
      standardNumber: request.standard.number,
      draftSummary: outcome.result.output,
      provenance: outcome.provenance,
      contentPin: request.pin,
      requiresHumanReview: true,
    };
  }
}
