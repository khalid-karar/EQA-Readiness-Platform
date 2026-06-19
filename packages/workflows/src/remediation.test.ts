import { describe, expect, it } from "vitest";
import {
  buildRemediationTrackerView,
  daysOverdue,
  isRemediationOverdue,
  resolveAssignRemediation,
  resolveReadyForRetest,
  resolveRetestFail,
  resolveRetestPass,
  type RemediationItem,
} from "./remediation";
import { IllegalRemediationStateError } from "./errors";

describe("remediation tracker (pure logic)", () => {
  const sampleItem: RemediationItem = {
    remediationId: "rem-1",
    assessmentId: "assessment-1",
    questionId: "Q-1-2-1",
    standardNumber: "1.2",
    action: "Update conflict-of-interest process",
    owner: "Audit Manager",
    targetDate: "2026-05-01",
    createdBy: "u1",
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedBy: "u1",
    updatedAt: "2026-04-01T00:00:00.000Z",
    closedAt: null,
    retestNote: null,
  };

  it("resolveAssignRemediation requires gap_confirmed", () => {
    expect(resolveAssignRemediation("gap_confirmed")).toEqual({
      from: "gap_confirmed",
      to: "remediation_in_progress",
    });
    expect(() => resolveAssignRemediation("remediation_in_progress")).toThrow(
      IllegalRemediationStateError,
    );
  });

  it("resolveReadyForRetest requires remediation_in_progress", () => {
    expect(resolveReadyForRetest("remediation_in_progress")).toEqual({
      from: "remediation_in_progress",
      to: "ready_for_retest",
    });
  });

  it("resolveRetestPass and resolveRetestFail require ready_for_retest", () => {
    expect(resolveRetestPass("ready_for_retest")).toEqual({
      from: "ready_for_retest",
      to: "closed_ready",
    });
    expect(resolveRetestFail("ready_for_retest")).toEqual({
      from: "ready_for_retest",
      to: "under_human_review",
    });
    expect(() => resolveRetestPass("remediation_in_progress")).toThrow(
      IllegalRemediationStateError,
    );
  });

  it("isRemediationOverdue flags past-due open items only", () => {
    expect(
      isRemediationOverdue(
        "2026-05-01",
        "remediation_in_progress",
        "2026-06-01",
      ),
    ).toBe(true);
    expect(
      isRemediationOverdue("2026-05-01", "closed_ready", "2026-06-01"),
    ).toBe(false);
    expect(
      isRemediationOverdue(
        "2026-07-01",
        "remediation_in_progress",
        "2026-06-01",
      ),
    ).toBe(false);
  });

  it("daysOverdue counts whole days past target", () => {
    expect(
      daysOverdue("2026-05-01", "remediation_in_progress", "2026-05-15"),
    ).toBe(14);
    expect(
      daysOverdue("2026-05-15", "remediation_in_progress", "2026-05-15"),
    ).toBe(0);
  });

  it("buildRemediationTrackerView surfaces overdue and role-aware actions", () => {
    const view = buildRemediationTrackerView({
      assessmentId: "assessment-1",
      assessmentName: { en: "Test", ar: "اختبار" },
      locale: "en",
      role: "cae",
      items: [sampleItem],
      statusesByQuestion: new Map([["Q-1-2-1", "remediation_in_progress"]]),
      standardTitles: new Map([["1.2", "Individual Objectivity"]]),
      referenceDate: "2026-06-15T12:00:00.000Z",
    });
    expect(view.openCount).toBe(1);
    expect(view.overdueCount).toBe(1);
    expect(view.items[0]?.isOverdue).toBe(true);
    expect(view.pendingActions.some((a) => a.id === "overdue")).toBe(true);
  });

  it("board summary omits in-progress detail action", () => {
    const board = buildRemediationTrackerView({
      assessmentId: "assessment-1",
      assessmentName: { en: "Test", ar: "اختبار" },
      locale: "en",
      role: "board",
      items: [sampleItem],
      statusesByQuestion: new Map([["Q-1-2-1", "remediation_in_progress"]]),
      standardTitles: new Map([["1.2", "Individual Objectivity"]]),
      referenceDate: "2026-06-15T12:00:00.000Z",
    });
    expect(board.isSummaryView).toBe(true);
    expect(board.pendingActions.some((a) => a.id === "in-progress")).toBe(
      false,
    );
    expect(board.pendingActions.some((a) => a.id === "overdue")).toBe(true);
  });
});
