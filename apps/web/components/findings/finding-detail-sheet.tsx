"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { ReviewAction } from "@eqa/workflows/types";
import { resolveHumanReview } from "@eqa/workflows/human-review";
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
import type { PresentedFinding, PresentedFindingStatus } from "@/lib/present-findings";
import { uiLabel } from "@/lib/ui-labels";
import { useToast } from "@/hooks/use-toast";

interface FindingDetailSheetProps {
  finding: PresentedFinding | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: "en" | "ar";
  canReview: boolean;
  onResolved: (findingId: string, status: PresentedFindingStatus, conclusion: string | null) => void;
}

function statusPillVariant(
  status: PresentedFindingStatus,
): "partial" | "gap" | "conformant" {
  if (status === "pending_review") return "partial";
  if (status === "gap_confirmed") return "gap";
  return "conformant";
}

export function FindingDetailSheet({
  finding,
  open,
  onOpenChange,
  locale,
  canReview,
  onResolved,
}: FindingDetailSheetProps): ReactNode {
  const { toast } = useToast();
  const [editText, setEditText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (finding?.draft) {
      setEditText(finding.draft.draftSummary);
      setIsEditing(false);
      setActionError(null);
    }
  }, [finding]);

  const applyAction = useCallback(
    (action: ReviewAction) => {
      if (!finding?.draft) return;
      setActionError(null);
      try {
        const outcome = resolveHumanReview(
          finding.draft,
          action,
          action === "edit_accept" ? editText : undefined,
        );
        const newStatus: PresentedFindingStatus =
          outcome.finalConclusion ? "gap_confirmed" : "no_gap";
        onResolved(
          finding.findingId,
          newStatus,
          outcome.finalConclusion?.conclusion ?? null,
        );
        toast({
          variant: newStatus === "gap_confirmed" ? "warning" : "success",
          title: uiLabel("findingActionSuccess", locale),
          description:
            newStatus === "gap_confirmed"
              ? uiLabel("findingAcceptedHint", locale)
              : uiLabel("findingRejectedHint", locale),
        });
        onOpenChange(false);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : uiLabel("findingActionError", locale);
        setActionError(message);
        toast({
          variant: "destructive",
          title: uiLabel("findingActionError", locale),
          description: message,
        });
      }
    },
    [finding, editText, locale, onOpenChange, onResolved, toast],
  );

  if (!finding) return null;

  const statusLabel =
    locale === "ar" ? finding.statusLabelAr : finding.statusLabelEn;
  const draftText = finding.draft?.draftSummary ?? finding.conclusionText ?? "";

  return (
    <SideSheet open={open} onOpenChange={onOpenChange}>
      <SideSheetContent
        side={detailPanelSide(locale)}
        aria-describedby="finding-sheet-desc"
      >
        <SideSheetHeader>
          <div className="min-w-0 space-y-1 pe-2">
            <SideSheetTitle>
              {finding.standardNumber} — {finding.standardTitle}
            </SideSheetTitle>
            <SideSheetDescription id="finding-sheet-desc">
              {uiLabel("findingDetailSubtitle", locale)} · {finding.questionId}
            </SideSheetDescription>
          </div>
          <SideSheetCloseButton aria-label={uiLabel("closePanel", locale)} />
        </SideSheetHeader>

        <SideSheetBody className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill variant={statusPillVariant(finding.status)}>
              {statusLabel}
            </StatusPill>
            <StatusPill variant="neutral">
              {locale === "ar" ? finding.sourceLabelAr : finding.sourceLabelEn}
            </StatusPill>
            <span className="text-xs text-muted-foreground">
              {locale === "ar" ? finding.ageLabelAr : finding.ageLabelEn}
            </span>
          </div>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">
              {finding.resolved
                ? uiLabel("findingConclusionTitle", locale)
                : uiLabel("findingDraftTitle", locale)}
            </h3>
            {isEditing && canReview && !finding.resolved ? (
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={6}
                className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={uiLabel("findingEditLabel", locale)}
              />
            ) : (
              <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm leading-relaxed">
                {draftText}
              </p>
            )}
          </section>

          {finding.draft ? (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">
                {uiLabel("findingProvenanceTitle", locale)}
              </h3>
              <dl className="grid gap-1 text-xs text-muted-foreground">
                <div className="flex justify-between gap-4">
                  <dt>{uiLabel("findingPromptVersion", locale)}</dt>
                  <dd className="font-mono text-foreground">
                    {finding.draft.provenance.promptVersion}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>{uiLabel("findingRubricVersion", locale)}</dt>
                  <dd className="font-mono text-foreground">
                    {finding.draft.provenance.rubricVersion}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>{uiLabel("findingModelAdapter", locale)}</dt>
                  <dd className="font-mono text-foreground">
                    {finding.draft.provenance.modelAdapter}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>{uiLabel("findingTimestamp", locale)}</dt>
                  <dd className="font-mono text-foreground">
                    {finding.draft.provenance.timestamp}
                  </dd>
                </div>
                <div>
                  <dt className="mb-1">{uiLabel("findingInputSummary", locale)}</dt>
                  <dd className="rounded border bg-surface px-2 py-1 font-mono text-[0.6875rem] text-foreground">
                    {finding.draft.provenance.inputSummary}
                  </dd>
                </div>
              </dl>
            </section>
          ) : null}

          {actionError ? (
            <p className="text-sm text-readiness-gap" role="alert">
              {actionError}
            </p>
          ) : null}

          {canReview && !finding.resolved ? (
            <div className="flex flex-wrap gap-2 border-t pt-4">
              <Button
                type="button"
                size="sm"
                onClick={() => applyAction("accept")}
              >
                {uiLabel("findingAccept", locale)}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  if (isEditing) {
                    applyAction("edit_accept");
                  } else {
                    setIsEditing(true);
                  }
                }}
              >
                {isEditing
                  ? uiLabel("findingEditAccept", locale)
                  : uiLabel("findingEdit", locale)}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => applyAction("reject")}
              >
                {uiLabel("findingReject", locale)}
              </Button>
            </div>
          ) : finding.resolved ? (
            <p className="text-xs text-muted-foreground border-t pt-4">
              {uiLabel("findingReadOnlyHint", locale)}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground border-t pt-4">
              {uiLabel("findingBoardHint", locale)}
            </p>
          )}
        </SideSheetBody>
      </SideSheetContent>
    </SideSheet>
  );
}
