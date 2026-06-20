"use client";

import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
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
import { StatusPill } from "@/components/ui/status-pill";
import type { PresentedWorkingPaperItem } from "@/lib/present-working-papers";
import { uiLabel } from "@/lib/ui-labels";

interface WorkingPaperDetailSheetProps {
  item: PresentedWorkingPaperItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: "en" | "ar";
  isSummaryView: boolean;
}

function conformancePillVariant(
  status: PresentedWorkingPaperItem["conformance"],
): "conformant" | "partial" | "gap" | "unreviewed" {
  if (status === "conformant") return "conformant";
  if (status === "partial") return "partial";
  if (status === "non_conformant") return "gap";
  return "unreviewed";
}

export function WorkingPaperDetailSheet({
  item,
  open,
  onOpenChange,
  locale,
  isSummaryView,
}: WorkingPaperDetailSheetProps): ReactNode {
  const sheetSide = locale === "ar" ? "start" : "end";

  if (!item) return null;

  const itemText = locale === "ar" ? item.itemTextAr : item.itemTextEn;
  const conformanceLabel =
    locale === "ar" ? item.conformanceLabelAr : item.conformanceLabelEn;
  const standardTitle =
    locale === "ar" ? item.standardTitleAr : item.standardTitleEn;
  const workingPaperTitle =
    locale === "ar" ? item.workingPaperTitleAr : item.workingPaperTitleEn;
  const pinLabel = locale === "ar" ? item.pinLabelAr : item.pinLabelEn;

  return (
    <SideSheet open={open} onOpenChange={onOpenChange}>
      <SideSheetContent side={sheetSide} aria-describedby="wp-sheet-desc">
        <SideSheetHeader>
          <div className="min-w-0 space-y-1 pe-2">
            <SideSheetTitle className="line-clamp-2">{itemText}</SideSheetTitle>
            <SideSheetDescription id="wp-sheet-desc">
              {uiLabel("wpDetailSubtitle", locale)} · {item.workingPaperRef}
            </SideSheetDescription>
          </div>
          <SideSheetCloseButton aria-label={uiLabel("closePanel", locale)} />
        </SideSheetHeader>

        <SideSheetBody className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill variant={conformancePillVariant(item.conformance)}>
              {conformanceLabel}
            </StatusPill>
            <StatusPill variant="neutral" size="sm">
              {item.itemId}
            </StatusPill>
          </div>

          {item.conformance === "unreviewed" ? (
            <div
              className="flex gap-2 rounded-md border border-readiness-unreviewed/40 bg-readiness-unreviewed-bg px-3 py-2 text-sm text-readiness-unreviewed"
              role="status"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
              <span>{uiLabel("wpUnreviewedGate", locale)}</span>
            </div>
          ) : null}

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {uiLabel("standard", locale)}
              </dt>
              <dd className="font-medium tabular-nums">{item.standardNumber}</dd>
              <dd className="text-muted-foreground">{standardTitle}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {uiLabel("wpWorkingPaper", locale)}
              </dt>
              <dd className="font-mono text-xs">{item.workingPaperRef}</dd>
              <dd className="text-muted-foreground">{workingPaperTitle}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {uiLabel("wpPinnedChecklist", locale)}
              </dt>
              <dd className="font-mono text-xs">{pinLabel}</dd>
            </div>
            {item.recordedAt ? (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {uiLabel("wpRecorded", locale)}
                </dt>
                <dd className="tabular-nums text-muted-foreground">
                  <time>{item.recordedAt}</time>
                  {item.recordedBy ? (
                    <span className="block text-xs">{item.recordedBy}</span>
                  ) : null}
                </dd>
              </div>
            ) : null}
          </dl>

          {item.note ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {uiLabel("wpReviewerNote", locale)}
              </p>
              <p className="text-sm">{item.note}</p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Button
              size="sm"
              disabled={isSummaryView}
              title={uiLabel("demoDisabledHint", locale)}
            >
              {uiLabel("wpRecordConformance", locale)}
            </Button>
            <p className="text-xs text-muted-foreground">
              {uiLabel("wpRecordHint", locale)}
            </p>
          </div>
        </SideSheetBody>
      </SideSheetContent>
    </SideSheet>
  );
}
