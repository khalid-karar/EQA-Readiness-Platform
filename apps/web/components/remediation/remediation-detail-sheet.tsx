"use client";

import { useCallback, useState, type ReactNode } from "react";
import type { ItemStatus } from "@eqa/workflows";
import {
  resolveAssignRemediation,
  resolveReadyForRetest,
  resolveRetestFail,
  resolveRetestPass,
} from "@eqa/workflows/remediation-pure";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  SideSheet,
  SideSheetBody,
  SideSheetCloseButton,
  SideSheetContent,
  SideSheetDescription,
  SideSheetHeader,
  SideSheetTitle,
} from "@/components/ui/side-sheet";
import { Button } from "@/components/ui/button";
import { StatusPill, readinessVariantFromLevel } from "@/components/ui/status-pill";
import { RemediationLifecycle } from "@/components/remediation/remediation-lifecycle";
import { overdueDaysLabel } from "@/lib/remediation-display";
import type { PresentedRemediationRow } from "@/lib/present-remediation";
import { uiLabel } from "@/lib/ui-labels";
import { uxStatusLevel } from "@/lib/status-level";
import { useToast } from "@/hooks/use-toast";

interface RemediationDetailSheetProps {
  row: PresentedRemediationRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: "en" | "ar";
  isSummaryView: boolean;
  canOperate: boolean;
  statusLabel: string;
  onStatusChange: (remediationId: string, status: ItemStatus) => void;
}

function isClosedStatus(status: ItemStatus): boolean {
  return status === "closed_ready" || status === "not_applicable";
}

export function RemediationDetailSheet({
  row,
  open,
  onOpenChange,
  locale,
  isSummaryView,
  canOperate,
  statusLabel,
  onStatusChange,
}: RemediationDetailSheetProps): ReactNode {
  const { toast } = useToast();
  const [actionError, setActionError] = useState<string | null>(null);

  const applyTransition = useCallback(
    (nextStatus: ItemStatus) => {
      if (!row) return;
      setActionError(null);
      onStatusChange(row.remediationId, nextStatus);
      toast({
        variant: "success",
        title: uiLabel("remediationActionSuccess", locale),
      });
      if (nextStatus === "closed_ready") {
        onOpenChange(false);
      }
    },
    [row, locale, onOpenChange, onStatusChange, toast],
  );

  const runAction = useCallback(
    (action: "start" | "ready" | "pass" | "fail") => {
      if (!row) return;
      setActionError(null);
      try {
        let transition;
        switch (action) {
          case "start":
            transition = resolveAssignRemediation(row.itemStatus);
            break;
          case "ready":
            transition = resolveReadyForRetest(row.itemStatus);
            break;
          case "pass":
            transition = resolveRetestPass(row.itemStatus);
            break;
          case "fail":
            transition = resolveRetestFail(row.itemStatus);
            break;
        }
        applyTransition(transition.to);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : uiLabel("remediationActionError", locale);
        setActionError(message);
        toast({
          variant: "destructive",
          title: uiLabel("remediationActionError", locale),
          description: message,
        });
      }
    },
    [row, locale, applyTransition, toast],
  );

  if (!row) return null;

  const sheetSide = locale === "ar" ? "start" : "end";
  const closed = isClosedStatus(row.itemStatus);
  const scheduleLabel =
    locale === "ar" ? row.scheduleLabelAr : row.scheduleLabelEn;
  const scheduleVariant =
    closed ? "conformant" : row.isOverdue ? "gap" : "partial";

  return (
    <SideSheet open={open} onOpenChange={onOpenChange}>
      <SideSheetContent side={sheetSide} aria-describedby="remediation-sheet-desc">
        <SideSheetHeader>
          <div className="min-w-0 space-y-1 pe-2">
            <SideSheetTitle>
              {row.standardNumber} — {row.standardTitle}
            </SideSheetTitle>
            <SideSheetDescription id="remediation-sheet-desc">
              {uiLabel("remediationDetailSubtitle", locale)} · {row.questionId}
            </SideSheetDescription>
          </div>
          <SideSheetCloseButton aria-label={uiLabel("closePanel", locale)} />
        </SideSheetHeader>

        <SideSheetBody className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill variant={readinessVariantFromLevel(uxStatusLevel(row.itemStatus))}>
              {statusLabel}
            </StatusPill>
            <StatusPill variant={scheduleVariant} size="sm">
              {scheduleLabel}
            </StatusPill>
          </div>

          <RemediationLifecycle
            status={row.itemStatus}
            locale={locale}
            hadRetestFailure={row.hadRetestFailure}
          />

          {isSummaryView ? (
            <p className="text-xs text-muted-foreground">
              {uiLabel("boardRemediationDetailHint", locale)}
            </p>
          ) : (
            <>
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">
                  {uiLabel("action", locale)}
                </h3>
                <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm leading-relaxed">
                  {row.action}
                </p>
              </section>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    {uiLabel("owner", locale)}
                  </p>
                  <p className="font-medium">{row.owner}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    {uiLabel("remediationDue", locale)}
                  </p>
                  <p className="font-medium tabular-nums">{row.targetDate}</p>
                </div>
              </div>

              {row.isOverdue && !closed ? (
                <div
                  className="flex items-center gap-2 rounded-md border border-readiness-gap/30 bg-readiness-gap-bg p-3 text-sm text-readiness-gap"
                  role="alert"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                  <span>
                    {uiLabel("remediationOverdueAlert", locale)}{" "}
                    <span className="font-medium tabular-nums">
                      ({overdueDaysLabel(locale, row.daysOverdue)})
                    </span>
                  </span>
                </div>
              ) : null}

              {row.retestNote ? (
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">
                    {uiLabel("remediationRetestNoteTitle", locale)}
                  </h3>
                  <p className="rounded-md border border-readiness-partial/30 bg-readiness-partial-bg px-3 py-2 text-sm">
                    {row.retestNote}
                  </p>
                </section>
              ) : null}

              {closed ? (
                <div className="flex items-center gap-2 text-sm text-readiness-conformant">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  <span>{uiLabel("remediationClosedHint", locale)}</span>
                </div>
              ) : null}

              {row.itemStatus === "under_human_review" ? (
                <p className="text-xs text-muted-foreground">
                  {uiLabel("remediationHumanReviewHint", locale)}
                </p>
              ) : null}
            </>
          )}

          {actionError ? (
            <p className="text-sm text-readiness-gap" role="alert">
              {actionError}
            </p>
          ) : null}

          {canOperate && !closed ? (
            <div className="flex flex-wrap gap-2 border-t pt-4">
              {row.itemStatus === "gap_confirmed" ? (
                <Button type="button" size="sm" onClick={() => runAction("start")}>
                  {uiLabel("remediationStart", locale)}
                </Button>
              ) : null}
              {row.itemStatus === "remediation_in_progress" ? (
                <Button type="button" size="sm" onClick={() => runAction("ready")}>
                  {uiLabel("remediationMarkReady", locale)}
                </Button>
              ) : null}
              {row.itemStatus === "ready_for_retest" ? (
                <>
                  <Button type="button" size="sm" onClick={() => runAction("pass")}>
                    {uiLabel("remediationRetestPass", locale)}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => runAction("fail")}
                  >
                    {uiLabel("remediationRetestFail", locale)}
                  </Button>
                </>
              ) : null}
            </div>
          ) : null}
        </SideSheetBody>
      </SideSheetContent>
    </SideSheet>
  );
}
