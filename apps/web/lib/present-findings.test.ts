import { describe, expect, it } from "vitest";
import { resolveHumanReview } from "@eqa/workflows";
import { buildFindingsPresentation } from "./present-findings";

describe("present-findings", () => {
  it("builds pending AI drafts and resolved human conclusions", () => {
    const presentation = buildFindingsPresentation("en", "cae");
    expect(presentation.findings.length).toBeGreaterThanOrEqual(4);
    const pending = presentation.findings.filter((f) => !f.resolved);
    const resolved = presentation.findings.filter((f) => f.resolved);
    expect(pending.length).toBe(3);
    expect(pending.every((f) => f.source === "ai")).toBe(true);
    expect(pending.every((f) => f.draft)).toBe(true);
    expect(resolved.length).toBe(1);
    expect(resolved[0]?.source).toBe("human");
    expect(presentation.canReview).toBe(true);
  });

  it("board role is read-only", () => {
    const presentation = buildFindingsPresentation("en", "board");
    expect(presentation.isSummaryView).toBe(true);
    expect(presentation.canReview).toBe(false);
  });

  it("accept action resolves via workflow pure function", () => {
    const presentation = buildFindingsPresentation("en", "cae");
    const pending = presentation.findings.find((f) => f.draft);
    expect(pending?.draft).toBeDefined();
    const outcome = resolveHumanReview(pending!.draft!, "accept");
    expect(outcome.finalConclusion).not.toBeNull();
    expect(outcome.statusPath).toEqual(["under_human_review", "gap_confirmed"]);
  });
});
