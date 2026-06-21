import type { Locale } from "@eqa/content";
import type { Identity, InferenceRequest, ModelAdapter } from "@eqa/ai";
import { AiReviewService } from "@eqa/ai";
import { ContentCatalog, loadContentPack, type Standard } from "@eqa/content";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { DraftFinding } from "./findings";
import { GapFlaggingEngine } from "./gap-flagging";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "__fixtures__");

export interface GapFlagEvalCase {
  readonly id: string;
  readonly locale: Locale;
  readonly fixture: "qa-a" | "qa-b";
  readonly questionId: string;
  readonly evidence: {
    readonly excerpts: readonly string[];
    readonly summary?: string;
    readonly identities: readonly Identity[];
  };
  /** Rubric substring expected in the model input for this locale. */
  readonly expectedRubricSnippet: string;
  /** When identities are present, names must not reach the model. */
  readonly forbiddenName?: string;
}

export interface GapFlagEvalScore {
  readonly caseId: string;
  readonly provenanceComplete: boolean;
  readonly rubricInInput: boolean;
  readonly redactionApplied: boolean;
  readonly draftProduced: boolean;
  readonly totalScore: number;
}

export interface GapFlagEvalRun {
  readonly draft: DraftFinding;
  readonly modelInput: InferenceRequest | undefined;
  readonly score: GapFlagEvalScore;
}

export interface GapFlagEvalSummary {
  readonly adapterId: string;
  readonly runs: readonly GapFlagEvalRun[];
  readonly averageScore: number;
  readonly allPassed: boolean;
}

/** Synthetic EN+AR cases scored against bundled QA fixtures. */
export const GAP_FLAG_EVAL_CASES: readonly GapFlagEvalCase[] = [
  {
    id: "qa-a-en-weak-evidence",
    locale: "en",
    fixture: "qa-a",
    questionId: "Q1",
    evidence: {
      excerpts: [
        "The reconciliation was performed once last year with no documented sign-off.",
      ],
      identities: [],
    },
    expectedRubricSnippet: "Not met",
  },
  {
    id: "qa-a-ar-weak-evidence",
    locale: "ar",
    fixture: "qa-a",
    questionId: "Q1",
    evidence: {
      excerpts: [
        "تم تنفيذ التسوية مرة واحدة العام الماضي دون توقيع موثّق.",
      ],
      identities: [],
    },
    expectedRubricSnippet: "غير مستوفى",
  },
  {
    id: "qa-b-en-redaction",
    locale: "en",
    fixture: "qa-b",
    questionId: "QB1",
    evidence: {
      excerpts: ["Auditor Noura Hassan reviewed the working paper."],
      identities: [{ name: "Noura Hassan", role: "audit_staff" }],
    },
    expectedRubricSnippet: "Beta Standard",
    forbiddenName: "Noura",
  },
  {
    id: "qa-b-ar-redaction",
    locale: "ar",
    fixture: "qa-b",
    questionId: "QB1",
    evidence: {
      excerpts: ["راجعت المدققة نورة حسن ورقة العمل."],
      identities: [{ name: "نورة حسن", role: "audit_staff" }],
    },
    expectedRubricSnippet: "معيار بيتا",
    forbiddenName: "نورة",
  },
];

function loadFixture(
  fixture: GapFlagEvalCase["fixture"],
): { standard: Standard; pin: ReturnType<ContentCatalog["pinForAssessment"]> } {
  const file = fixture === "qa-a" ? "qa-a.json" : "qa-b.json";
  const assessmentId = fixture === "qa-a" ? "assessment-1" : "assessment-b";
  const pack = loadContentPack(join(fixtures, file));
  const catalog = new ContentCatalog();
  catalog.register(pack);
  const pin = catalog.pinForAssessment(
    assessmentId,
    pack.meta.contentPackId,
    pack.meta.version,
  );
  const standard = pack.domains[0]?.principles[0]?.standards[0];
  if (!standard) throw new Error(`fixture ${file} missing standard`);
  return { standard, pin };
}

export function scoreGapFlagRun(
  caseDef: GapFlagEvalCase,
  draft: DraftFinding,
  modelInput: InferenceRequest | undefined,
): GapFlagEvalScore {
  const provenanceComplete =
    draft.provenance.promptVersion.length > 0 &&
    draft.provenance.rubricVersion.length > 0 &&
    draft.provenance.modelAdapter.length > 0 &&
    draft.provenance.timestamp.length > 0 &&
    draft.provenance.inputSummary.length > 0 &&
    draft.provenance.output.length > 0;

  const inputText = modelInput
    ? [
        ...modelInput.excerpts,
        modelInput.summary ?? "",
        ...Object.values(modelInput.metadata).map(String),
      ].join("\n")
    : "";

  const rubricInInput = inputText.includes(caseDef.expectedRubricSnippet);
  const redactionApplied =
    caseDef.forbiddenName === undefined ||
    !inputText.includes(caseDef.forbiddenName);
  const draftProduced =
    draft.kind === "draft_finding" &&
    draft.requiresHumanReview &&
    draft.draftSummary.length > 0;

  const checks = [provenanceComplete, rubricInInput, redactionApplied, draftProduced];
  const totalScore = Math.round(
    (checks.filter(Boolean).length / checks.length) * 100,
  );

  return {
    caseId: caseDef.id,
    provenanceComplete,
    rubricInInput,
    redactionApplied,
    draftProduced,
    totalScore,
  };
}

/**
 * Recording wrapper that captures the minimized, redacted request handed to the
 * model after all guards have run.
 */
export class RecordingModelAdapter implements ModelAdapter {
  readonly seen: InferenceRequest[] = [];
  readonly id: string;
  readonly location: ModelAdapter["location"];

  constructor(private readonly inner: ModelAdapter) {
    this.id = inner.id;
    this.location = inner.location;
  }

  async infer(request: InferenceRequest) {
    this.seen.push(request);
    return this.inner.infer(request);
  }
}

/** Runs gap-flag eval cases against any adapter (stub for CI, Ollama for local eval). */
export async function runGapFlagEval(
  adapter: ModelAdapter,
): Promise<GapFlagEvalSummary> {
  const recording = new RecordingModelAdapter(adapter);
  const engine = new GapFlaggingEngine(new AiReviewService(recording));
  const runs: GapFlagEvalRun[] = [];

  for (const caseDef of GAP_FLAG_EVAL_CASES) {
    const { standard, pin } = loadFixture(caseDef.fixture);
    const draft = await engine.flag({
      questionId: caseDef.questionId,
      pin,
      standard,
      locale: caseDef.locale,
      evidence: caseDef.evidence,
    });
    const modelInput = recording.seen.at(-1);
    const score = scoreGapFlagRun(caseDef, draft, modelInput);
    runs.push({ draft, modelInput, score });
  }

  const averageScore =
    runs.length === 0
      ? 0
      : Math.round(
          runs.reduce((sum, run) => sum + run.score.totalScore, 0) / runs.length,
        );
  const allPassed = runs.every((run) => run.score.totalScore === 100);

  return {
    adapterId: adapter.id,
    runs,
    averageScore,
    allPassed,
  };
}
