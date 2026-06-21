"use client";

import { Suspense, type ReactNode } from "react";
import type { StandardDetailPresentation } from "@/lib/present-standard-detail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill, readinessVariantFromLevel } from "@/components/ui/status-pill";
import { ScreenAlertBanner } from "@/components/ui/screen-alert-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { useSyncShellMeta } from "@/components/shell/use-sync-shell-meta";
import { DEFAULT_TENANT_NAME } from "@/lib/nav-config";
import { uxStatusLevel } from "@/lib/status-level";
import { uiLabel } from "@/lib/ui-labels";

interface StandardDetailClientProps {
  presentation: StandardDetailPresentation;
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

function StandardDetailClientInner({
  presentation,
}: StandardDetailClientProps): ReactNode {
  const { locale, isSummaryView, standardNumber, standardTitle } = presentation;

  useSyncShellMeta({
    locale,
    tenantName: DEFAULT_TENANT_NAME,
    assessmentName: presentation.assessmentName,
    location: `${standardNumber} — ${standardTitle}`,
    roleLabel: presentation.roleLabel,
    isSummaryView,
  });

  return (
    <div className="space-y-6">
      <ScreenAlertBanner variant="brand" title={uiLabel("standardDetailReadOnlyTitle", locale)}>
        {uiLabel("standardDetailReadOnlyBody", locale)}
      </ScreenAlertBanner>

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
              <p className="text-sm text-muted-foreground">{presentation.domainLabel}</p>
              <p className="text-sm text-muted-foreground">{presentation.principleLabel}</p>
              <p className="text-xs text-muted-foreground/80">
                {uiLabel("contentPin", locale)}: {presentation.contentPinLabel}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-xs text-muted-foreground">
                {uiLabel("standardDetailDerivedStatus", locale)}
              </span>
              <StatusPill variant={presentation.derivedStatusVariant} size="sm">
                {presentation.derivedStatusLabel}
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

        {presentation.requirements.map((req) => (
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
                            variant={
                              ev.scanStatus === "clean" ? "conformant" : "gap"
                            }
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
            </CardContent>
          </Card>
        ))}
      </section>

      {presentation.wpConformance.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{uiLabel("wpConformance", locale)}</h2>
            <p className="text-sm text-muted-foreground">
              {uiLabel("standardDetailWpHint", locale)}
            </p>
          </div>
          <Card>
            <CardContent className="divide-y p-0">
              {presentation.wpConformance.map((item) => (
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

        {presentation.decisionTrail.length === 0 ? (
          <EmptyState
            title={uiLabel("standardDetailDecisionTrailEmpty", locale)}
            {...(presentation.decisionTrailEmptyNote
              ? { description: presentation.decisionTrailEmptyNote }
              : {})}
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <ol className="divide-y">
                {presentation.decisionTrail.map((entry) => (
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
}: StandardDetailClientProps): ReactNode {
  return (
    <Suspense fallback={null}>
      <StandardDetailClientInner presentation={presentation} />
    </Suspense>
  );
}
