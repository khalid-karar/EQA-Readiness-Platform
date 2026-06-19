import { assertEvidenceSafeAdapter } from "./adapters";
import {
  assertMinimized,
  DEFAULT_MINIMIZATION_LIMITS,
  summarizeRequest,
} from "./minimization";
import { assertNoNames, redactNames } from "./redaction";
import type {
  AiReviewOutcome,
  CallProvenance,
  EvidenceReviewInput,
  InferenceRequest,
  MinimizationLimits,
  ModelAdapter,
} from "./types";

export interface AiReviewServiceOptions {
  readonly limits?: MinimizationLimits;
  /** Clock injection for deterministic provenance timestamps in tests. */
  readonly now?: () => Date;
}

/**
 * Orchestrates a single AI review with the guards the platform requires, in
 * order, before any text reaches the model:
 *
 *  1. external-adapter guard (at construction) — evidence never goes to an
 *     out-of-Kingdom API;
 *  2. data-minimization guard — only bounded excerpts, structured metadata, and
 *     a redacted summary, never raw files;
 *  3. redaction guard — personal names become role tokens, and a post-redaction
 *     assertion ensures none slipped through;
 *  4. inference via the swappable {@link ModelAdapter};
 *  5. call provenance (rule 12) for every call.
 *
 * The service holds no database dependency. It is composed with concrete
 * bindings (queue, audit port) where it is used, the same as jobs and storage.
 */
export class AiReviewService {
  private readonly limits: MinimizationLimits;
  private readonly now: () => Date;

  constructor(
    private readonly adapter: ModelAdapter,
    options: AiReviewServiceOptions = {},
  ) {
    // Fail closed: an external-API adapter can never be used for evidence.
    assertEvidenceSafeAdapter(adapter);
    this.limits = options.limits ?? DEFAULT_MINIMIZATION_LIMITS;
    this.now = options.now ?? (() => new Date());
  }

  async review(input: EvidenceReviewInput): Promise<AiReviewOutcome> {
    // (2) Minimize first, so an over-large/binary payload is rejected before any
    // further processing or model contact.
    assertMinimized(input, this.limits);

    // (3) Redact personal identifiers, then prove none remain.
    const excerpts = input.excerpts.map(
      (e) => redactNames(e, input.identities).text,
    );
    const summary =
      input.summary === undefined
        ? undefined
        : redactNames(input.summary, input.identities).text;
    for (const text of [...excerpts, summary ?? ""]) {
      assertNoNames(text, input.identities);
    }

    const request: InferenceRequest = {
      promptVersion: input.promptVersion,
      rubricVersion: input.rubricVersion,
      excerpts,
      metadata: input.metadata,
      ...(summary === undefined ? {} : { summary }),
    };

    // (4) Inference through the swappable adapter.
    const result = await this.adapter.infer(request);

    // (5) Provenance for every call (rule 12).
    const provenance: CallProvenance = {
      promptVersion: input.promptVersion,
      rubricVersion: input.rubricVersion,
      modelAdapter: this.adapter.id,
      adapterLocation: this.adapter.location,
      inputSummary: summarizeRequest(request),
      output: result.output,
      timestamp: this.now().toISOString(),
    };

    return { result, provenance };
  }
}
