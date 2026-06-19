import type { CallProvenance } from "@eqa/ai";
import type { ContentPin } from "@eqa/content";
import { describe, expect, it } from "vitest";
import { InvalidReviewInputError } from "./errors";
import {
  assertFinalConclusion,
  isDraftFinding,
  isFinalConclusion,
  type DraftFinding,
} from "./findings";
import { resolveHumanReview } from "./human-review";
import { canTransition } from "./state-machine";

function syntheticDraft(): DraftFinding {
  const provenance: CallProvenance = {
    promptVersion: "gap-flag@1.0.0",
    rubricVersion: "1.0.0",
    modelAdapter: "local-stub",
    adapterLocation: "local",
    inputSummary: "excerpts=2",
    output: "DRAFT: partial gap in ethics documentation.",
    timestamp: "2026-06-19T12:00:00.000Z",
  };
  const contentPin: ContentPin = {
    assessmentId: "assessment-1",
    contentPackId: "eqa-foundations",
    version: "1.0.0",
    contentHash: "abc123",
  };
  return {
    kind: "draft_finding",
    status: "draft",
    findingId: "finding-1",
    assessmentId: "assessment-1",
    questionId: "Q-1-1-1",
    standardNumber: "1.1",
    draftSummary: "DRAFT: partial gap in ethics documentation.",
    provenance,
    contentPin,
    requiresHumanReview: true,
  };
}

describe("resolveHumanReview (pure Step 11 logic)", () => {
  it("accept produces a FinalConclusion from the draft text and gap_confirmed path", () => {
    const draft = syntheticDraft();
    const outcome = resolveHumanReview(draft, "accept");

    expect(outcome.finalConclusion).not.toBeNull();
    expect(outcome.finalConclusion?.kind).toBe("final_conclusion");
    expect(outcome.finalConclusion?.conclusion).toBe(draft.draftSummary);
    expect(outcome.statusPath).toEqual(["under_human_review", "gap_confirmed"]);
    expect(outcome.editedText).toBeNull();
    expect(outcome.provenance.promptVersion).toBe("gap-flag@1.0.0");
    expect(outcome.contentPin.contentHash).toBe("abc123");
  });

  it("reject produces no FinalConclusion and a reviewed_no_gap path", () => {
    const outcome = resolveHumanReview(syntheticDraft(), "reject");

    expect(outcome.finalConclusion).toBeNull();
    expect(outcome.statusPath).toEqual([
      "under_human_review",
      "reviewed_no_gap",
    ]);
  });

  it("edit_accept uses the reviewer's edited text as the final conclusion", () => {
    const edited = "Reviewer-edited: gap confirmed with revised wording.";
    const outcome = resolveHumanReview(syntheticDraft(), "edit_accept", edited);

    expect(outcome.editedText).toBe(edited);
    expect(outcome.finalConclusion?.conclusion).toBe(edited);
    expect(outcome.finalConclusion?.conclusion).not.toBe(
      syntheticDraft().draftSummary,
    );
    expect(outcome.statusPath).toEqual(["under_human_review", "gap_confirmed"]);
  });

  it("rejects edit_accept without non-empty editedConclusion", () => {
    expect(() => resolveHumanReview(syntheticDraft(), "edit_accept")).toThrow(
      InvalidReviewInputError,
    );
    expect(() =>
      resolveHumanReview(syntheticDraft(), "edit_accept", "   "),
    ).toThrow(InvalidReviewInputError);
  });

  it("a draft cannot be treated as final — only resolveHumanReview constructs finals", () => {
    const draft = syntheticDraft();
    expect(isDraftFinding(draft)).toBe(true);
    expect(isFinalConclusion(draft)).toBe(false);
    expect(() => assertFinalConclusion(draft)).toThrow();
  });

  it("every outcome path requires human review before a conclusion state", () => {
    for (const action of ["accept", "reject", "edit_accept"] as const) {
      const outcome = resolveHumanReview(
        syntheticDraft(),
        action,
        action === "edit_accept" ? "edited" : undefined,
      );
      expect(outcome.statusPath[0]).toBe("under_human_review");
      expect(canTransition("ai_flagged", "under_human_review")).toBe(true);
      expect(canTransition("under_human_review", outcome.statusPath[1])).toBe(
        true,
      );
      expect(canTransition("ai_flagged", outcome.statusPath[1])).toBe(false);
    }
  });
});
