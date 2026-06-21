"use client";

import { Suspense, useCallback, useState, type ReactNode } from "react";
import type { ChecklistConformance } from "@eqa/content";
import {
  computeDerivedStandardPresentation,
  type PresentedStandardRequirement,
  type PresentedWpConformanceItem,
  type StandardDetailPresentation,
} from "@/lib/present-standard-detail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill, readinessVariantFromLevel } from "@/components/ui/status-pill";
import { ScreenAlertBanner } from "@/components/ui/screen-alert-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { StandardRequirementActions } from "@/components/standards/standard-requirement-actions";
import { useSyncShellMeta } from "@/components/shell/use-sync-shell-meta";
import { DEFAULT_TENANT_NAME } from "@/lib/nav-config";
import { uxStatusLevel } from "@/lib/status-level";
import { uiLabel } from "@/lib/ui-labels";
import { postUiAction } from "@/lib/ui-action-client";
import { uxStatusLabel } from "@eqa/workflows";
import { useToast } from "@/hooks/use-toast";

interface StandardDetailClientProps {
  presentation: StandardDetailPresentation;
  realWritesEnabled: boolean;
}

function formatTimestamp(iso: string, locale: StandardDetailPresentation["locale"]): string {
  try {
    return new Date(iso).toLocaleString(locale === "ar" ? "ar-SA" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function wpVariantFromRaw(
  raw: PresentedWpConformanceItem["conformanceRaw"],
): PresentedWpConformanceItem["conformanceVariant"] {
  if (raw === "conforms") return "conformant";
  if (raw === "does_not_conform") return "gap";
  if (raw === "not_applicable") return "neutral";
  return "partial";
}

function StandardDetailClientInner({
  presentation: initial,
  realWritesEnabled,
}: StandardDetailClientProps): ReactNode {
  const { toast } = useToast();
  const [requirements, setRequirements] = useState(initial.requirements);
  const [wpConformance, setWpConformance] = useState(initial.wpConformance);
  const [wpSubmittingId, setWpSubmittingId] = useState<string | null>(null);

  const {
    locale,
    isSummaryView,
    canOperate,
    canReview,
    standardNumber,
    standardTitle,
    assessmentId,
  } = initial;

  const derived = computeDerivedStandardPresentation(requirements, wpConformance, locale);

  useSyncShellMeta({
    locale,
    tenantName: DEFAULT_TENANT_NAME,
    assessmentName: initial.assessmentName,
    location: `${standardNumber} — ${standardTitle}`,
    roleLabel: initial.roleLabel,
    isSummaryView,
  });

  const handleRequirementChange = useCallback(
    (questionId: string, updated: PresentedStandardRequirement) => {
      setRequirements((prev) =>
        prev.map((r) => {
          if (r.questionId !== questionId) return r;
          return {
            ...updated,
            statusLabel: uxStatusLabel(updated.status, locale),
          };
        }),
      );
    },
    [locale],
  );

  const handleRecordWp = useCallback(
    async (item: PresentedWpConformanceItem, conformance: ChecklistConformance) => {
      setWpSubmittingId(item.id);
      try {
        if (realWritesEnabled) {
          await postUiAction("/api/actions/record-conformance", {
            checklistId: item.checklistId,
            checklistItemId: item.itemId,
            conformance,
          });
        }
        const label =
          conformance === "conforms"
            ? locale === "ar"
              ? "مطابق"
              : "Conforms"
            : conformance === "does_not_conform"
              ? locale === "ar"
                ? "لا يطابق"
                : "Does not conform"
              : locale === "ar"
                ? "غير قابل للتطبيق"
                : "Not applicable";
        setWpConformance((prev) =>
          prev.map((row) =>
            row.id === item.id
              ? {
                  ...row,
                  conformanceRaw: conformance,
                  conformanceLabel: label,
                  conformanceVariant: wpVariantFromRaw(conformance),
                }
              : row,
          ),
        );
        toast({ variant: "success", title: uiLabel("wpRecordSuccess", locale) });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : uiLabel("wpErrorDemo", locale);
        toast({
          variant: "destructive",
          title: uiLabel("wpErrorDemo", locale),
          description: message,
        });
      } finally {
        setWpSubmittingId(null);
      }
    },
    [locale, realWritesEnabled, toast],
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-3 pb-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-sm text-muted-foreground">
                {uiLabel("standardDetailLocation", locale)}
              </p>
              <CardTitle className="text-xl">
                <span className="tabular-nums">{standardNumber}</span>
                <span className="mx-2 text-muted-foreground">·</span>
                {standardTitle}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{initial.domainLabel}</p>
              <p className="text-sm text-muted-foreground">{initial.principleLabel}</p>
              <p className="text-xs text-muted-foreground/80">
                {uiLabel("contentPin", locale)}: {initial.contentPinLabel}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-xs text-muted-foreground">
                {uiLabel("standardDetailDerivedStatus", locale)}
              </span>
              <StatusPill variant={derived.derivedStatusVariant} size="sm">
                {derived.derivedStatusLabel}
              </StatusPill>
            </div>
          </div>
        </CardHeader>
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{uiLabel("standardDetailRequirements", locale)}</h2>
          <p className="text-sm text-muted-foreground">
            {uiLabel("standardDetailRequirementsHint", locale)}
          </p>
        </div>

        {requirements.map((req) => (
          <Card key={req.questionId}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="font-mono text-xs text-muted-foreground">{req.questionId}</p>
                  <CardTitle className="text-base leading-snug">{req.questionText}</CardTitle>
                </div>
                <StatusPill
                  variant={readinessVariantFromLevel(uxStatusLevel(req.status))}
                  size="sm"
                >
                  {req.statusLabel}
                </StatusPill>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {req.answer ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {uiLabel("standardDetailAnswer", locale)}
                  </p>
                  <p className="text-sm">{req.answer}</p>
                </div>
              ) : null}

              {req.note ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {uiLabel("standardDetailNote", locale)}
                  </p>
                  <p className="text-sm text-muted-foreground">{req.note}</p>
                </div>
              ) : null}

              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  {uiLabel("standardDetailEvidence", locale)}
                </p>
                {req.evidence.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {uiLabel("standardDetailNoEvidence", locale)}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {req.evidence.map((ev) => (
                      <li
                        key={ev.evidenceId}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm"
                      >
                        <span className="min-w-0 truncate font-medium">{ev.fileName}</span>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {locale === "ar" ? ev.sizeLabelAr : ev.sizeLabelEn}
                          </span>
                          <StatusPill
                            variant={ev.scanStatus === "clean" ? "conformant" : "gap"}
                            size="sm"
                          >
                            {locale === "ar" ? ev.scanLabelAr : ev.scanLabelEn}
                          </StatusPill>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {req.draftSummary ? (
                <ScreenAlertBanner
                  variant="partial"
                  title={uiLabel("standardDetailAiDraftTitle", locale)}
                >
                  <p>{req.draftSummary}</p>
                  <p className="mt-2 text-xs italic">
                    {uiLabel("standardDetailAiDraftDisclaimer", locale)}
                  </p>
                </ScreenAlertBanner>
              ) : null}

              {req.finalConclusion ? (
                <ScreenAlertBanner
                  variant="gap"
                  title={uiLabel("standardDetailFinalConclusion", locale)}
                >
                  {req.finalConclusion}
                </ScreenAlertBanner>
              ) : null}

              <StandardRequirementActions
                assessmentId={assessmentId}
                standardNumber={standardNumber}
                requirement={req}
                locale={locale}
                canOperate={canOperate}
                canReview={canReview}
                realWritesEnabled={realWritesEnabled}
                onRequirementChange={(updated) =>
                  handleRequirementChange(req.questionId, updated)
                }
              />
            </CardContent>
          </Card>
        ))}
      </section>

      {wpConformance.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{uiLabel("wpConformance", locale)}</h2>
            <p className="text-sm text-muted-foreground">
              {uiLabel("standardDetailWpHint", locale)}
            </p>
          </div>
          <Card>
            <CardContent className="divide-y p-0">
              {wpConformance.map((item) => (
                <div key={item.id} className="space-y-2 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{item.itemText}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.workingPaperRef} · {item.workingPaperTitle}
                      </p>
                    </div>
                    <StatusPill variant={item.conformanceVariant} size="sm">
                      {item.conformanceLabel}
                    </StatusPill>
                  </div>
                  {canOperate && item.conformanceRaw === null ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={wpSubmittingId === item.id}
                        onClick={() => void handleRecordWp(item, "conforms")}
                      >
                        {uiLabel("wpConformantLabel", locale)}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={wpSubmittingId === item.id}
                        onClick={() => void handleRecordWp(item, "does_not_conform")}
                      >
                        {uiLabel("wpNonConformantLabel", locale)}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={wpSubmittingId === item.id}
                        onClick={() => void handleRecordWp(item, "not_applicable")}
                      >
                        {uiLabel("wpPartialLabel", locale)}
                      </Button>
                    </div>
                  ) : null}
                  {item.note ? (
                    <p className="text-sm text-muted-foreground">{item.note}</p>
                  ) : null}
                  {item.recordedBy ? (
                    <p className="text-xs text-muted-foreground">
                      {uiLabel("wpRecorded", locale)}: {item.recordedBy}
                      {item.recordedAt
                        ? ` · ${formatTimestamp(item.recordedAt, locale)}`
                        : null}
                    </p>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">
            {uiLabel("standardDetailDecisionTrail", locale)}
          </h2>
          <p className="text-sm text-muted-foreground">
            {uiLabel("standardDetailDecisionTrailHint", locale)}
          </p>
        </div>

        {initial.decisionTrail.length === 0 ? (
          <EmptyState
            title={uiLabel("standardDetailDecisionTrailEmpty", locale)}
            {...(initial.decisionTrailEmptyNote
              ? { description: initial.decisionTrailEmptyNote }
              : {})}
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <ol className="divide-y">
                {initial.decisionTrail.map((entry) => (
                  <li key={entry.id} className="space-y-1 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{formatTimestamp(entry.occurredAt, locale)}</span>
                      <span className="font-medium">{entry.actionLabel}</span>
                    </div>
                    <p className="text-sm">
                      <span className="font-medium">{entry.actorLabel}</span>
                      <span className="mx-1 text-muted-foreground">·</span>
                      {entry.summary}
                    </p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}
      </section>

      {isSummaryView ? (
        <ScreenAlertBanner variant="unreviewed" title={uiLabel("summaryHint", locale)}>
          {uiLabel("standardDetailBoardHint", locale)}
        </ScreenAlertBanner>
      ) : null}
    </div>
  );
}

export function StandardDetailClient({
  presentation,
  realWritesEnabled,
}: StandardDetailClientProps): ReactNode {
  return (
    <Suspense fallback={null}>
      <StandardDetailClientInner
        presentation={presentation}
        realWritesEnabled={realWritesEnabled}
      />
    </Suspense>
  );
}
