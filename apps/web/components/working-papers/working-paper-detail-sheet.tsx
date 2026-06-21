"use client";

import { useCallback, useState, type ReactNode } from "react";
import type { ChecklistConformance } from "@eqa/content";
import {
  SideSheet,
  SideSheetBody,
  SideSheetCloseButton,
  SideSheetContent,
  detailPanelSide,
  SideSheetDescription,
  SideSheetHeader,
  SideSheetTitle,
} from "@/components/ui/side-sheet";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import type {
  PresentedWorkingPaperItem,
  PresentedWpConformance,
} from "@/lib/present-working-papers";
import { postUiAction } from "@/lib/ui-action-client";
import { uiLabel } from "@/lib/ui-labels";
import { useToast } from "@/hooks/use-toast";

interface WorkingPaperDetailSheetProps {
  item: PresentedWorkingPaperItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: "en" | "ar";
  isSummaryView: boolean;
  realWritesEnabled: boolean;
  onRecorded: (
    itemId: string,
    conformance: PresentedWpConformance,
    note: string | null,
  ) => void;
}

function conformancePillVariant(
  status: PresentedWorkingPaperItem["conformance"],
): "conformant" | "partial" | "gap" | "unreviewed" {
  if (status === "conformant") return "conformant";
  if (status === "partial") return "partial";
  if (status === "non_conformant") return "gap";
  return "unreviewed";
}

function toApiConformance(
  value: PresentedWpConformance,
): ChecklistConformance {
  if (value === "conformant") return "conforms";
  if (value === "non_conformant") return "does_not_conform";
  return "not_applicable";
}

const CONFORMANCE_OPTIONS: readonly PresentedWpConformance[] = [
  "conformant",
  "partial",
  "non_conformant",
];

export function WorkingPaperDetailSheet({
  item,
  open,
  onOpenChange,
  locale,
  isSummaryView,
  realWritesEnabled,
  onRecorded,
}: WorkingPaperDetailSheetProps): ReactNode {
  const { toast } = useToast();
  const [selectedConformance, setSelectedConformance] =
    useState<PresentedWpConformance>("conformant");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const conformanceLabel = (value: PresentedWpConformance): string => {
    if (value === "conformant") return uiLabel("wpConformantLabel", locale);
    if (value === "non_conformant") return uiLabel("wpNonConformantLabel", locale);
    return uiLabel("wpPartialLabel", locale);
  };

  const handleRecord = useCallback(async () => {
    if (!item) return;
    setActionError(null);
    setSubmitting(true);
    try {
      if (realWritesEnabled) {
        await postUiAction("/api/actions/record-conformance", {
          checklistId: item.checklistId,
          checklistItemId: item.itemId,
          conformance: toApiConformance(selectedConformance),
          ...(note ? { note } : {}),
        });
      }
      onRecorded(item.id, selectedConformance, note || null);
      toast({
        variant: "success",
        title: uiLabel("wpRecordSuccess", locale),
      });
      setNote("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : uiLabel("wpErrorDemo", locale);
      setActionError(message);
      toast({
        variant: "destructive",
        title: uiLabel("wpErrorDemo", locale),
        description: message,
      });
    } finally {
      setSubmitting(false);
    }
  }, [
    item,
    locale,
    note,
    onRecorded,
    realWritesEnabled,
    selectedConformance,
    toast,
  ]);

  if (!item) return null;

  const itemText = locale === "ar" ? item.itemTextAr : item.itemTextEn;
  const conformanceLabelCurrent =
    locale === "ar" ? item.conformanceLabelAr : item.conformanceLabelEn;
  const standardTitle =
    locale === "ar" ? item.standardTitleAr : item.standardTitleEn;
  const workingPaperTitle =
    locale === "ar" ? item.workingPaperTitleAr : item.workingPaperTitleEn;
  const pinLabel = locale === "ar" ? item.pinLabelAr : item.pinLabelEn;
  const canRecord =
    !isSummaryView && (realWritesEnabled || item.conformance === "unreviewed");

  return (
    <SideSheet open={open} onOpenChange={onOpenChange}>
      <SideSheetContent
        side={detailPanelSide(locale)}
        aria-describedby="wp-sheet-desc"
      >
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
              {conformanceLabelCurrent}
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

          {canRecord ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <label
                  className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  htmlFor="wp-conformance-select"
                >
                  {uiLabel("wpConformanceSelect", locale)}
                </label>
                <select
                  id="wp-conformance-select"
                  value={selectedConformance}
                  onChange={(e) =>
                    setSelectedConformance(e.target.value as PresentedWpConformance)
                  }
                  className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm"
                >
                  {CONFORMANCE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {conformanceLabel(option)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label
                  className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  htmlFor="wp-note"
                >
                  {uiLabel("assessmentNoteLabel", locale)}
                </label>
                <textarea
                  id="wp-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm"
                />
              </div>
              <Button
                size="sm"
                type="button"
                disabled={submitting}
                onClick={() => handleRecord()}
              >
                {uiLabel("wpRecordConformance", locale)}
              </Button>
              <p className="text-xs text-muted-foreground">
                {realWritesEnabled
                  ? uiLabel("wpRecordHint", locale)
                  : uiLabel("demoDisabledHint", locale)}
              </p>
            </div>
          ) : isSummaryView ? (
            <p className="text-xs text-muted-foreground">
              {uiLabel("wpBoardHint", locale)}
            </p>
          ) : null}

          {actionError ? (
            <p className="text-sm text-readiness-gap" role="alert">
              {actionError}
            </p>
          ) : null}
        </SideSheetBody>
      </SideSheetContent>
    </SideSheet>
  );
}
