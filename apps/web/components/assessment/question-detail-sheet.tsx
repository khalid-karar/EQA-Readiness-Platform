"use client";

import { useCallback, useState, type ReactNode } from "react";
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
import { StatusPill, readinessVariantFromLevel } from "@/components/ui/status-pill";
import type { PresentedAssessmentStandard } from "@/lib/present-assessment";
import { postUiAction } from "@/lib/ui-action-client";
import { uxStatusLevel } from "@/lib/status-level";
import { uiLabel } from "@/lib/ui-labels";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface QuestionDetailSheetProps {
  assessmentId: string;
  standard: PresentedAssessmentStandard | null;
  selectedQuestionId: string | null;
  onQuestionSelect: (questionId: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: "en" | "ar";
  isSummaryView: boolean;
  realWritesEnabled: boolean;
  onResponseSubmitted: (
    questionId: string,
    answer: string,
    note: string | null,
  ) => void;
}

export function QuestionDetailSheet({
  assessmentId,
  standard,
  selectedQuestionId,
  onQuestionSelect,
  open,
  onOpenChange,
  locale,
  isSummaryView,
  realWritesEnabled,
  onResponseSubmitted,
}: QuestionDetailSheetProps): ReactNode {
  const { toast } = useToast();
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const question =
    standard?.questions.find((q) => q.questionId === selectedQuestionId) ??
    standard?.questions[0] ??
    null;

  const handleSubmit = useCallback(async () => {
    if (!question || !selectedLevel) return;
    setActionError(null);
    setSubmitting(true);
    try {
      if (realWritesEnabled) {
        await postUiAction("/api/actions/submit-response", {
          assessmentId,
          questionId: question.questionId,
          answer: selectedLevel,
          ...(note ? { note } : {}),
          pin: {
            contentPackId: question.pinPackId,
            version: question.pinVersion,
            contentHash: question.pinHash,
          },
        });
      }
      onResponseSubmitted(question.questionId, selectedLevel, note || null);
      toast({
        variant: "success",
        title: uiLabel("assessmentSubmitSuccess", locale),
      });
      setNote("");
      setSelectedLevel(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : uiLabel("assessmentErrorDemo", locale);
      setActionError(message);
      toast({
        variant: "destructive",
        title: uiLabel("assessmentErrorDemo", locale),
        description: message,
      });
    } finally {
      setSubmitting(false);
    }
  }, [
    assessmentId,
    locale,
    note,
    onResponseSubmitted,
    question,
    realWritesEnabled,
    selectedLevel,
    toast,
  ]);

  if (!standard || !question) return null;

  const statusLabel =
    locale === "ar" ? question.statusLabelAr : question.statusLabelEn;
  const pinLabel = locale === "ar" ? question.pinLabelAr : question.pinLabelEn;
  const canSubmit =
    !isSummaryView && question.rubric.length > 0 && (realWritesEnabled || !question.answer);

  return (
    <SideSheet open={open} onOpenChange={onOpenChange}>
      <SideSheetContent
        side={detailPanelSide(locale)}
        aria-describedby="assessment-sheet-desc"
      >
        <SideSheetHeader>
          <div className="min-w-0 space-y-1 pe-2">
            <SideSheetTitle>
              {standard.standardNumber} — {standard.standardTitle}
            </SideSheetTitle>
            <SideSheetDescription id="assessment-sheet-desc">
              {uiLabel("assessmentDetailSubtitle", locale)} · {question.questionId}
            </SideSheetDescription>
          </div>
          <SideSheetCloseButton aria-label={uiLabel("closePanel", locale)} />
        </SideSheetHeader>

        <SideSheetBody className="space-y-6">
          {standard.questions.length > 1 ? (
            <div
              className="flex flex-wrap gap-2"
              role="tablist"
              aria-label={uiLabel("questionItems", locale)}
            >
              {standard.questions.map((q) => {
                const active = q.questionId === question.questionId;
                const label =
                  locale === "ar" ? q.statusLabelAr : q.statusLabelEn;
                return (
                  <Button
                    key={q.questionId}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    role="tab"
                    aria-selected={active}
                    className="h-auto max-w-full py-1.5 text-start"
                    onClick={() => onQuestionSelect(q.questionId)}
                  >
                    <span className="block truncate text-xs font-normal opacity-80">
                      {q.questionId}
                    </span>
                    <span className="block truncate text-sm">{label}</span>
                  </Button>
                );
              })}
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {uiLabel("assessmentQuestionTitle", locale)}
            </p>
            <p className="text-sm leading-relaxed">{question.questionText}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusPill
              variant={readinessVariantFromLevel(uxStatusLevel(question.status))}
            >
              {statusLabel}
            </StatusPill>
            <StatusPill variant="neutral" size="sm">
              {uiLabel("assessmentPinnedVersion", locale)}: {pinLabel}
            </StatusPill>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {uiLabel("assessmentCurrentResponse", locale)}
            </p>
            {question.answer ? (
              <>
                <p className="text-lg font-semibold tabular-nums">{question.answer}</p>
                {question.note ? (
                  <p className="text-sm text-muted-foreground">{question.note}</p>
                ) : null}
                {question.respondedAt ? (
                  <p className="text-xs text-muted-foreground">
                    {uiLabel("assessmentRespondedBy", locale)}:{" "}
                    <span className="font-medium">{question.respondedBy}</span> ·{" "}
                    <time className="tabular-nums">{question.respondedAt}</time>
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {uiLabel("assessmentNoResponse", locale)}
              </p>
            )}
          </div>

          {question.rubric.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {uiLabel("assessmentRubricTitle", locale)}
              </p>
              <ul className="space-y-2">
                {question.rubric.map((level) => (
                  <li key={level.level}>
                    <button
                      type="button"
                      disabled={!canSubmit || submitting}
                      onClick={() => setSelectedLevel(String(level.level))}
                      className={cn(
                        "w-full rounded-md border px-3 py-2 text-sm text-start transition-colors",
                        selectedLevel === String(level.level) &&
                          "border-brand-gold/50 bg-brand-gold/5",
                        question.answer === String(level.level) &&
                          "border-brand-gold/30",
                        canSubmit && "hover:bg-muted/50",
                      )}
                    >
                      <p className="font-medium tabular-nums">
                        {level.level} — {level.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {level.descriptor}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {question.history.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {uiLabel("assessmentHistoryTitle", locale)}
              </p>
              <ul className="space-y-3">
                {question.history.map((entry) => (
                  <li
                    key={`${entry.respondedAt}-${entry.answer}`}
                    className="rounded-md border bg-surface px-3 py-2 text-sm"
                  >
                    <p className="font-medium">
                      {locale === "ar" ? entry.labelAr : entry.labelEn}
                    </p>
                    <p className="tabular-nums">
                      {uiLabel("assessmentAnswer", locale)}: {entry.answer}
                    </p>
                    {entry.note ? (
                      <p className="text-xs text-muted-foreground">{entry.note}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {entry.pinVersion} · {entry.pinHashPrefix}… ·{" "}
                      <time className="tabular-nums">{entry.respondedAt}</time>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {canSubmit ? (
            <div className="space-y-3 border-t pt-4">
              <div className="space-y-2">
                <label
                  className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  htmlFor="assessment-note"
                >
                  {uiLabel("assessmentNoteLabel", locale)}
                </label>
                <textarea
                  id="assessment-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm"
                />
              </div>
              <Button
                type="button"
                size="sm"
                disabled={!selectedLevel || submitting}
                onClick={() => handleSubmit()}
              >
                {uiLabel("assessmentSubmit", locale)}
              </Button>
              {!realWritesEnabled ? (
                <p className="text-xs text-muted-foreground">
                  {uiLabel("demoDisabledHint", locale)}
                </p>
              ) : null}
            </div>
          ) : isSummaryView ? (
            <p className="text-xs text-muted-foreground">
              {uiLabel("assessmentBoardHint", locale)}
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
