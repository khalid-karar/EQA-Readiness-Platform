"use client";

import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import type { EngagementsPresentation } from "@/lib/present-engagements";
import { AdminActionsPanel } from "@/components/admin/admin-actions-panel";
import { ScreenAlertBanner } from "@/components/ui/screen-alert-banner";
import { StatusPill } from "@/components/ui/status-pill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSyncShellMeta } from "@/components/shell/use-sync-shell-meta";
import { DEFAULT_TENANT_NAME } from "@/lib/nav-config";
import { uiLabel } from "@/lib/ui-labels";

interface EngagementsClientProps {
  presentation: EngagementsPresentation;
  realWritesEnabled: boolean;
}

function EngagementsClientInner({
  presentation,
  realWritesEnabled,
}: EngagementsClientProps): ReactNode {
  const { locale, isSummaryView, engagements } = presentation;

  useSyncShellMeta({
    locale,
    tenantName: DEFAULT_TENANT_NAME,
    assessmentName: presentation.assessmentName,
    location: uiLabel("engagementsLocation", locale),
    roleLabel: presentation.roleLabel,
    isSummaryView,
  });

  return (
    <div className="space-y-6">
      <ScreenAlertBanner
        variant="partial"
        title={uiLabel("engagementsOpenQuestionsTitle", locale)}
      >
        <ul className="list-disc space-y-1 ps-5 text-sm">
          <li>{uiLabel("engagementsOpenQuestionGrain", locale)}</li>
          <li>{uiLabel("engagementsOpenQuestionStandardDetail", locale)}</li>
          <li>{uiLabel("engagementsOpenQuestionNav", locale)}</li>
        </ul>
      </ScreenAlertBanner>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {engagements.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{uiLabel("engagementsTitle", locale)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {uiLabel("engagementsEmptyDescription", locale)}
                </p>
              </CardContent>
            </Card>
          ) : (
            engagements.map((engagement) => (
              <Card key={engagement.engagementId}>
                <CardHeader className="pb-2">
                  <CardTitle>{uiLabel("engagementsTitle", locale)}</CardTitle>
                  <p className="text-sm font-medium">
                    {locale === "ar"
                      ? engagement.titleAr
                      : engagement.titleEn}
                  </p>
                  <p className="text-sm text-muted-foreground tabular-nums">
                    {locale === "ar"
                      ? engagement.periodLabelAr
                      : engagement.periodLabelEn}
                  </p>
                  {(locale === "ar"
                    ? engagement.sampleRationaleAr
                    : engagement.sampleRationaleEn) ? (
                    <p className="text-sm text-muted-foreground">
                      {uiLabel("engagementsSampleRationale", locale)}:{" "}
                      {locale === "ar"
                        ? engagement.sampleRationaleAr
                        : engagement.sampleRationaleEn}
                    </p>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="divide-y divide-border rounded-md border border-border">
                    {engagement.papers.map((paper) => (
                      <li
                        key={paper.workingPaperId}
                        className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="min-w-0 space-y-1">
                          <p className="font-mono text-sm font-medium tabular-nums">
                            {paper.reference}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {locale === "ar" ? paper.titleAr : paper.titleEn}
                          </p>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {paper.standardTitles.map((std) => (
                              <Link
                                key={std.standardNumber}
                                href={`/assessment?locale=${locale}&standard=${encodeURIComponent(std.standardNumber)}`}
                                className="inline-flex"
                              >
                                <StatusPill variant="neutral" size="sm">
                                  {std.standardNumber}
                                </StatusPill>
                              </Link>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {locale === "ar"
                              ? paper.standardTitles
                                  .map((s) => s.titleAr)
                                  .join(" · ")
                              : paper.standardTitles
                                  .map((s) => s.titleEn)
                                  .join(" · ")}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                          <StatusPill
                            variant={
                              paper.unreviewedCount > 0
                                ? "unreviewed"
                                : "conformant"
                            }
                            size="sm"
                          >
                            {paper.reviewedCount}/{paper.totalItemCount}{" "}
                            {uiLabel("engagementsItemsReviewed", locale)}
                          </StatusPill>
                          <Link
                            href={`/working-papers?locale=${locale}`}
                            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                          >
                            {uiLabel("engagementsTestPaper", locale)}
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <aside>
          <AdminActionsPanel
            locale={locale}
            realWritesEnabled={realWritesEnabled}
            canRun={presentation.canRunAdminActions}
            assessmentId={presentation.assessmentId}
            contentPackId={presentation.contentPackId}
            contentPackVersion={presentation.contentPackVersion}
            hasGeneratedEvidencePack={presentation.hasGeneratedEvidencePack}
            evidencePackDownloadPath={presentation.evidencePackDownloadPath}
          />
        </aside>
      </div>
    </div>
  );
}

export function EngagementsClient(props: EngagementsClientProps): ReactNode {
  return (
    <Suspense fallback={null}>
      <EngagementsClientInner {...props} />
    </Suspense>
  );
}
