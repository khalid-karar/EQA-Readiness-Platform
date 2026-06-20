"use client";

import type { ItemStatus } from "@eqa/workflows";
import { ArrowRight, RotateCcw } from "lucide-react";
import { StatusPill, readinessVariantFromLevel } from "@/components/ui/status-pill";
import { uiLabel } from "@/lib/ui-labels";
import { uxStatusLevel } from "@/lib/status-level";
import { cn } from "@/lib/utils";

const LIFECYCLE_STEPS: readonly {
  status: ItemStatus;
  labelKey:
    | "remediationLifecycleGap"
    | "remediationLifecycleInProgress"
    | "remediationLifecycleReadyRetest"
    | "remediationLifecycleClosed";
}[] = [
  { status: "gap_confirmed", labelKey: "remediationLifecycleGap" },
  { status: "remediation_in_progress", labelKey: "remediationLifecycleInProgress" },
  { status: "ready_for_retest", labelKey: "remediationLifecycleReadyRetest" },
  { status: "closed_ready", labelKey: "remediationLifecycleClosed" },
];

function activeStepIndex(status: ItemStatus): number {
  if (status === "closed_ready" || status === "not_applicable") return 3;
  if (status === "ready_for_retest") return 2;
  if (status === "remediation_in_progress") return 1;
  if (status === "gap_confirmed") return 0;
  if (status === "under_human_review") return -1;
  return 0;
}

interface RemediationLifecycleProps {
  status: ItemStatus;
  locale: "en" | "ar";
  hadRetestFailure: boolean;
  className?: string;
}

export function RemediationLifecycle({
  status,
  locale,
  hadRetestFailure,
  className,
}: RemediationLifecycleProps): React.ReactNode {
  const active = activeStepIndex(status);
  const inRetestLoop =
    status === "under_human_review" || (status === "closed_ready" && hadRetestFailure);

  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="text-sm font-semibold">{uiLabel("remediationLifecycleTitle", locale)}</h3>

      <ol
        className="flex flex-wrap items-center gap-2"
        aria-label={uiLabel("remediationLifecycleTitle", locale)}
      >
        {LIFECYCLE_STEPS.map((step, index) => {
          const isActive = active === index;
          const isPast = active > index;
          const variant = readinessVariantFromLevel(
            isActive || isPast ? uxStatusLevel(step.status) : "amber",
          );
          return (
            <li key={step.status} className="flex items-center gap-2">
              <StatusPill
                variant={isActive ? variant : isPast ? "conformant" : "neutral"}
                size="sm"
                className={cn(!isActive && !isPast && "opacity-60")}
              >
                {uiLabel(step.labelKey, locale)}
              </StatusPill>
              {index < LIFECYCLE_STEPS.length - 1 ? (
                <ArrowRight
                  className="h-3.5 w-3.5 text-muted-foreground rtl:rotate-180"
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>

      {inRetestLoop ? (
        <div
          className="rounded-md border border-readiness-partial/30 bg-readiness-partial-bg p-3 text-sm"
          role="note"
        >
          <div className="flex items-start gap-2">
            <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-readiness-partial" aria-hidden />
            <div className="space-y-1">
              <p className="font-medium text-readiness-partial">
                {uiLabel("remediationRetestLoopTitle", locale)}
              </p>
              <p className="text-xs text-muted-foreground">
                {uiLabel("remediationRetestLoopHint", locale)}
              </p>
              {status === "under_human_review" ? (
                <StatusPill variant="partial" size="sm" className="mt-2">
                  {uiLabel("remediationLifecycleHumanReview", locale)}
                </StatusPill>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
