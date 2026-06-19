import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AiReviewService,
  LocalStubModelAdapter,
  type InferenceRequest,
  type InferenceResult,
  type ModelAdapter,
} from "@eqa/ai";
import { ContentCatalog, loadContentPack, type Standard } from "@eqa/content";
import { describe, expect, it } from "vitest";
import { NotFinalConclusionError } from "./errors";
import {
  assertFinalConclusion,
  isDraftFinding,
  isFinalConclusion,
} from "./findings";
import { GAP_FLAG_PROMPT_VERSION, GapFlaggingEngine } from "./gap-flagging";
import { allowedTransitions, canTransition } from "./state-machine";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "__fixtures__");

/** A model adapter that records every request, to prove what reaches the model. */
class RecordingAdapter implements ModelAdapter {
  readonly id = "recording";
  readonly location = "local" as const;
  readonly seen: InferenceRequest[] = [];

  infer(request: InferenceRequest): Promise<InferenceResult> {
    this.seen.push(request);
    return Promise.resolve({
      output: "DRAFT: evidence appears to partially meet the standard.",
      model: "recording-model",
    });
  }
}

function loadStandard(): {
  standard: Standard;
  pin: ReturnType<ContentCatalog["pinForAssessment"]>;
} {
  const pack = loadContentPack(join(fixtures, "qa-a.json"));
  const catalog = new ContentCatalog();
  catalog.register(pack);
  const pin = catalog.pinForAssessment(
    "assessment-1",
    pack.meta.contentPackId,
    pack.meta.version,
  );
  const standard = pack.domains[0]?.principles[0]?.standards[0];
  if (!standard) throw new Error("fixture missing standard");
  return { standard, pin };
}

describe("GapFlaggingEngine (Step 10)", () => {
  it("drafts a gap finding from synthetic evidence + rubric", async () => {
    const { standard, pin } = loadStandard();
    const engine = new GapFlaggingEngine(
      new AiReviewService(new LocalStubModelAdapter()),
    );

    const draft = await engine.flag({
      questionId: "Q1",
      pin,
      standard,
      evidence: {
        excerpts: ["The reconciliation procedure was performed monthly."],
        identities: [],
      },
    });

    expect(draft.kind).toBe("draft_finding");
    expect(draft.status).toBe("draft");
    expect(draft.requiresHumanReview).toBe(true);
    expect(draft.assessmentId).toBe("assessment-1");
    expect(draft.questionId).toBe("Q1");
    expect(draft.standardNumber).toBe(standard.number);
    expect(draft.draftSummary.length).toBeGreaterThan(0);
  });

  it("stamps the draft with prompt version + rubric version + adapter + content pin", async () => {
    const { standard, pin } = loadStandard();
    const engine = new GapFlaggingEngine(
      new AiReviewService(new LocalStubModelAdapter()),
    );

    const draft = await engine.flag({
      questionId: "Q1",
      pin,
      standard,
      evidence: { excerpts: ["Synthetic evidence excerpt."], identities: [] },
    });

    // rule 12: prompt version, rubric version, model adapter all recorded.
    expect(draft.provenance.promptVersion).toBe(GAP_FLAG_PROMPT_VERSION);
    expect(draft.provenance.rubricVersion).toBe(pin.version);
    expect(draft.provenance.modelAdapter).toBe("local-stub");
    expect(draft.provenance.adapterLocation).toBe("local");
    expect(draft.provenance.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    // The content pin ties the finding to the exact rubric version + bytes.
    expect(draft.contentPin).toEqual(pin);
    expect(draft.contentPin.contentHash).toBe(pin.contentHash);
  });

  it("routes through the Step 9 layer: rubric reaches the model, names are redacted", async () => {
    const { standard, pin } = loadStandard();
    const adapter = new RecordingAdapter();
    const engine = new GapFlaggingEngine(new AiReviewService(adapter));

    await engine.flag({
      questionId: "Q1",
      pin,
      standard,
      evidence: {
        excerpts: ["Auditor Sara Ahmed signed off the working paper."],
        identities: [{ name: "Sara Ahmed", role: "audit_staff" }],
      },
    });

    const request = adapter.seen[0];
    expect(request).toBeDefined();
    const allText = (request?.excerpts ?? []).join("\n");
    // The authored rubric is sent so the model has criteria to compare against.
    expect(allText).toContain("RUBRIC L0");
    // Redaction (Step 9) replaced the personal name before any model contact.
    expect(allText).not.toContain("Sara");
    expect(allText).not.toContain("Ahmed");
    expect(allText).toContain("[AUDIT_STAFF]");
  });

  it("produces a draft that cannot be read or treated as a final conclusion", async () => {
    const { standard, pin } = loadStandard();
    const engine = new GapFlaggingEngine(
      new AiReviewService(new LocalStubModelAdapter()),
    );

    const draft = await engine.flag({
      questionId: "Q1",
      pin,
      standard,
      evidence: { excerpts: ["Synthetic evidence."], identities: [] },
    });

    expect(isDraftFinding(draft)).toBe(true);
    expect(isFinalConclusion(draft)).toBe(false);
    // Demanding a final conclusion of a draft fails closed.
    expect(() => assertFinalConclusion(draft)).toThrow(NotFinalConclusionError);
  });

  it("leaves no path from an AI draft to a final outcome without human review", () => {
    // The Step 8 state machine is the structural guarantee: once an item is
    // AI Flagged, the ONLY legal move is into human review. There is no edge to
    // any conclusion (gap_confirmed / reviewed_no_gap / closed_ready) directly.
    expect(allowedTransitions("ai_flagged")).toEqual(["under_human_review"]);
    expect(canTransition("ai_flagged", "under_human_review")).toBe(true);
    expect(canTransition("ai_flagged", "gap_confirmed")).toBe(false);
    expect(canTransition("ai_flagged", "reviewed_no_gap")).toBe(false);
    expect(canTransition("ai_flagged", "closed_ready")).toBe(false);
  });
});
