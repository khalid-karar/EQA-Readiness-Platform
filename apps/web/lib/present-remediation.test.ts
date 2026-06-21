import { describe, expect, it } from "vitest";
import { buildRemediationPresentation } from "./present-remediation";

describe("remediation presentation", () => {
  it("buildRemediationPresentation includes retest-loop and lifecycle demo rows", () => {
    const presentation = buildRemediationPresentation("en", "cae");
    expect(presentation.rows.length).toBeGreaterThanOrEqual(3);
    expect(presentation.openCount).toBeGreaterThan(0);
    const closedWithNote = presentation.rows.find((r) => r.hadRetestFailure);
    expect(closedWithNote?.retestNote).toBeTruthy();
    const awaitingRetest = presentation.rows.find(
      (r) => r.itemStatus === "ready_for_retest",
    );
    expect(awaitingRetest).toBeDefined();
  });

  it("board view is summary-only", () => {
    const presentation = buildRemediationPresentation("en", "board");
    expect(presentation.isSummaryView).toBe(true);
    expect(presentation.canOperate).toBe(false);
  });
});
