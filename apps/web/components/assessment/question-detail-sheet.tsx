"use client";

import type { ReactNode } from "react";
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
import { uxStatusLevel } from "@/lib/status-level";
import { uiLabel } from "@/lib/ui-labels";
import { cn } from "@/lib/utils";

interface QuestionDetailSheetProps {
  standard: PresentedAssessmentStandard | null;
  selectedQuestionId: string | null;
  onQuestionSelect: (questionId: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: "en" | "ar";
  isSummaryView: boolean;
}

export function QuestionDetailSheet({
  standard,
  selectedQuestionId,
  onQuestionSelect,
  open,
  onOpenChange,
  locale,
  isSummaryView,
}: QuestionDetailSheetProps): ReactNode {
  if (!standard) return null;

  const question =
    standard.questions.find((q) => q.questionId === selectedQuestionId) ??
    standard.questions[0] ??
    null;

  if (!question) return null;

  const statusLabel =
    locale === "ar" ? question.statusLabelAr : question.statusLabelEn;
  const pinLabel = locale === "ar" ? question.pinLabelAr : question.pinLabelEn;

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
            <div className="flex flex-wrap gap-2" role="tablist" aria-label={uiLabel("questionItems", locale)}>
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
                  <li
                    key={level.level}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm",
                      question.answer === String(level.level) &&
                        "border-brand-gold/50 bg-brand-gold/5",
                    )}
                  >
                    <p className="font-medium tabular-nums">
                      {level.level} — {level.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {level.descriptor}
                    </p>
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

          {!isSummaryView ? (
            <p className="text-xs text-muted-foreground">
              {uiLabel("demoDisabledHint", locale)}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {uiLabel("assessmentBoardHint", locale)}
            </p>
          )}
        </SideSheetBody>
      </SideSheetContent>
    </SideSheet>
  );
}
