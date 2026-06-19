import { describe, expect, it } from "vitest";
import { IllegalStatusTransitionError, UnknownItemStatusError } from "./errors";
import {
  allowedTransitions,
  assertItemStatus,
  assertTransition,
  canTransition,
  INITIAL_ITEM_STATUS,
  isItemStatus,
  isTerminalStatus,
  ITEM_STATUSES,
  STATUS_LABELS,
  type ItemStatus,
} from "./state-machine";

// The legal graph, expressed independently of the implementation so the tests
// pin the intended behaviour rather than echo the source.
const LEGAL: Record<ItemStatus, ItemStatus[]> = {
  not_assessed: ["evidence_requested", "not_applicable"],
  evidence_requested: ["evidence_submitted", "not_applicable"],
  evidence_submitted: ["ai_flagged", "under_human_review", "not_applicable"],
  ai_flagged: ["under_human_review"],
  under_human_review: ["gap_confirmed", "reviewed_no_gap"],
  gap_confirmed: ["remediation_in_progress"],
  remediation_in_progress: ["ready_for_retest"],
  ready_for_retest: ["under_human_review", "closed_ready"],
  reviewed_no_gap: ["closed_ready"],
  closed_ready: [],
  not_applicable: ["not_assessed"],
};

describe("item status state machine (pure rules)", () => {
  it("every legal transition is accepted", () => {
    for (const from of ITEM_STATUSES) {
      for (const to of LEGAL[from]) {
        expect(canTransition(from, to)).toBe(true);
        expect(() => assertTransition(from, to)).not.toThrow();
        expect(allowedTransitions(from)).toContain(to);
      }
    }
  });

  it("every transition NOT in the legal set is rejected", () => {
    for (const from of ITEM_STATUSES) {
      const legal = new Set<ItemStatus>(LEGAL[from]);
      for (const to of ITEM_STATUSES) {
        if (legal.has(to)) continue;
        expect(canTransition(from, to)).toBe(false);
        expect(() => assertTransition(from, to)).toThrow(
          IllegalStatusTransitionError,
        );
      }
    }
  });

  it("an AI flag must be confirmed by a human (ai_flagged → under_human_review only)", () => {
    expect(canTransition("ai_flagged", "under_human_review")).toBe(true);
    // It cannot jump straight to an outcome, bypassing human review.
    expect(canTransition("ai_flagged", "gap_confirmed")).toBe(false);
    expect(canTransition("ai_flagged", "reviewed_no_gap")).toBe(false);
    expect(canTransition("ai_flagged", "closed_ready")).toBe(false);
    expect(allowedTransitions("ai_flagged")).toEqual(["under_human_review"]);
  });

  it("a dismissed AI finding lands in reviewed_no_gap and cannot collapse into closed_ready", () => {
    // The dismissal path: AI flag → human review → reviewed (no gap) → closed.
    expect(canTransition("ai_flagged", "under_human_review")).toBe(true);
    expect(canTransition("under_human_review", "reviewed_no_gap")).toBe(true);
    expect(canTransition("reviewed_no_gap", "closed_ready")).toBe(true);

    // The forbidden shortcut: review must never collapse straight to Closed/Ready.
    expect(canTransition("under_human_review", "closed_ready")).toBe(false);
    expect(() =>
      assertTransition("under_human_review", "closed_ready"),
    ).toThrow(IllegalStatusTransitionError);
  });

  it("a confirmed gap path: review → gap → remediation → re-test → closed", () => {
    expect(canTransition("under_human_review", "gap_confirmed")).toBe(true);
    expect(canTransition("gap_confirmed", "remediation_in_progress")).toBe(
      true,
    );
    expect(canTransition("remediation_in_progress", "ready_for_retest")).toBe(
      true,
    );
    expect(canTransition("ready_for_retest", "closed_ready")).toBe(true);
    // A failed re-test loops back to human review.
    expect(canTransition("ready_for_retest", "under_human_review")).toBe(true);
    // A gap cannot skip remediation and close directly.
    expect(canTransition("gap_confirmed", "closed_ready")).toBe(false);
  });

  it("closed_ready is terminal", () => {
    expect(isTerminalStatus("closed_ready")).toBe(true);
    expect(allowedTransitions("closed_ready")).toEqual([]);
    for (const to of ITEM_STATUSES) {
      expect(canTransition("closed_ready", to)).toBe(false);
    }
  });

  it("a status cannot transition to itself", () => {
    for (const status of ITEM_STATUSES) {
      expect(canTransition(status, status)).toBe(false);
    }
  });

  it("every non-initial status is reachable from the initial status", () => {
    const seen = new Set<ItemStatus>([INITIAL_ITEM_STATUS]);
    const queue: ItemStatus[] = [INITIAL_ITEM_STATUS];
    while (queue.length > 0) {
      const current = queue.shift() as ItemStatus;
      for (const next of allowedTransitions(current)) {
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    for (const status of ITEM_STATUSES) {
      expect(seen.has(status)).toBe(true);
    }
  });

  it("recognises and narrows known statuses, rejecting unknown ones", () => {
    expect(isItemStatus("gap_confirmed")).toBe(true);
    expect(isItemStatus("definitely_not_a_status")).toBe(false);
    expect(isItemStatus(42)).toBe(false);
    expect(assertItemStatus("closed_ready")).toBe("closed_ready");
    expect(() => assertItemStatus("nope")).toThrow(UnknownItemStatusError);
  });

  it("has a bilingual label for every status", () => {
    for (const status of ITEM_STATUSES) {
      expect(STATUS_LABELS[status].en.length).toBeGreaterThan(0);
      expect(STATUS_LABELS[status].ar.length).toBeGreaterThan(0);
    }
  });
});
