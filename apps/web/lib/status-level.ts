import type { ItemStatus } from "@eqa/workflows";

/** Client-safe mirror of workflow status colour bands (no package import). */
const STATUS_LEVEL: Record<ItemStatus, "green" | "amber" | "red"> = {
  not_assessed: "amber",
  evidence_requested: "amber",
  evidence_submitted: "amber",
  ai_flagged: "amber",
  under_human_review: "amber",
  gap_confirmed: "red",
  reviewed_no_gap: "green",
  remediation_in_progress: "red",
  ready_for_retest: "amber",
  closed_ready: "green",
  not_applicable: "green",
};

export function uxStatusLevel(status: ItemStatus): "green" | "amber" | "red" {
  return STATUS_LEVEL[status];
}
