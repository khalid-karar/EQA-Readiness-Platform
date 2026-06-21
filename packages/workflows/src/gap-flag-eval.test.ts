import { LocalStubModelAdapter } from "@eqa/ai";
import { describe, expect, it } from "vitest";
import {
  GAP_FLAG_EVAL_CASES,
  runGapFlagEval,
} from "./gap-flag-eval.harness";

describe("gap-flag eval harness (synthetic fixtures)", () => {
  it("scores EN+AR gap drafting against the rubric with the local stub (CI)", async () => {
    const summary = await runGapFlagEval(new LocalStubModelAdapter());

    expect(summary.runs).toHaveLength(GAP_FLAG_EVAL_CASES.length);
    expect(summary.adapterId).toBe("local-stub");
    expect(summary.allPassed).toBe(true);
    expect(summary.averageScore).toBe(100);

    for (const run of summary.runs) {
      expect(run.score.provenanceComplete).toBe(true);
      expect(run.score.rubricInInput).toBe(true);
      expect(run.score.redactionApplied).toBe(true);
      expect(run.score.draftProduced).toBe(true);
      expect(run.draft.provenance.inputSummary).not.toMatch(/Noura|نورة/);
    }
  });
});
