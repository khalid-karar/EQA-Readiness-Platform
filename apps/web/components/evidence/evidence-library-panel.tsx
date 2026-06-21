"use client";

import { useCallback, useState, type ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, Download, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PresentedEvidenceItem } from "@/lib/present-evidence";
import { getEvidenceDownloadUrl } from "@/lib/evidence-api-client";
import { uiLabel } from "@/lib/ui-labels";
import { useToast } from "@/hooks/use-toast";

interface EvidenceLibraryPanelProps {
  item: PresentedEvidenceItem | null;
  locale: "en" | "ar";
  isSummaryView: boolean;
  realWritesEnabled: boolean;
}

function scanPillVariant(
  status: PresentedEvidenceItem["scanStatus"],
): "conformant" | "unreviewed" | "gap" {
  if (status === "clean") return "conformant";
  if (status === "infected") return "gap";
  return "unreviewed";
}

export function EvidenceLibraryPanel({
  item,
  locale,
  isSummaryView,
  realWritesEnabled,
}: EvidenceLibraryPanelProps): ReactNode {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!item?.downloadable || isSummaryView) return;
    setDownloading(true);
    try {
      if (realWritesEnabled) {
        const url = await getEvidenceDownloadUrl(item.evidenceId, item.version);
        window.location.assign(url);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : uiLabel("evidenceErrorDemo", locale);
      toast({
        variant: "destructive",
        title: uiLabel("evidenceDownloadBlocked", locale),
        description: message,
      });
    } finally {
      setDownloading(false);
    }
  }, [item, isSummaryView, locale, realWritesEnabled, toast]);

  if (!item) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{uiLabel("evidenceLibraryPanelTitle", locale)}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {uiLabel("evidenceLibrarySelectHint", locale)}
          </p>
        </CardContent>
      </Card>
    );
  }

  const scanLabel = locale === "ar" ? item.scanLabelAr : item.scanLabelEn;
  const quarantineNote =
    locale === "ar" ? item.quarantineNoteAr : item.quarantineNoteEn;
  const typeLabel = locale === "ar" ? item.typeLabelAr : item.typeLabelEn;
  const sizeLabel = locale === "ar" ? item.sizeLabelAr : item.sizeLabelEn;
  const evidenceRef =
    locale === "ar" ? item.evidenceRefAr : item.evidenceRefEn;

  return (
    <Card className="h-full">
      <CardHeader className="space-y-1 pb-3">
        <CardTitle className="truncate text-base">{item.fileName}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {uiLabel("evidenceDetailSubtitle", locale)} · {evidenceRef}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill variant={scanPillVariant(item.scanStatus)}>
            {scanLabel}
          </StatusPill>
          <StatusPill variant="neutral" size="sm">
            {typeLabel}
          </StatusPill>
          {item.reusedAcrossStandards ? (
            <StatusPill variant="neutral" size="sm">
              <Link2 className="h-3 w-3" aria-hidden />
              {uiLabel("evidenceLibraryReusedBadge", locale)}
            </StatusPill>
          ) : null}
        </div>

        {!item.downloadable ? (
          <div
            className="flex gap-2 rounded-md border border-readiness-partial/40 bg-readiness-partial-bg px-3 py-2 text-sm text-readiness-partial"
            role="status"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            <span>{quarantineNote}</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{quarantineNote}</p>
        )}

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {uiLabel("evidenceLibraryStandardsHeading", locale)}
          </p>
          <ul className="space-y-3">
            {item.linkedStandards.map((mapping) => (
              <li
                key={mapping.standardNumber}
                className="rounded-md border border-border px-3 py-2"
              >
                <p className="font-medium tabular-nums">
                  {mapping.standardNumber}
                </p>
                <p className="text-xs text-muted-foreground">
                  {locale === "ar"
                    ? mapping.standardTitleAr
                    : mapping.standardTitleEn}
                </p>
                {mapping.questionIds.length > 0 ? (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {mapping.questionIds.map((questionId) => (
                      <li key={questionId}>
                        <StatusPill variant="neutral" size="sm">
                          {questionId}
                        </StatusPill>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {uiLabel("evidenceSize", locale)}
            </dt>
            <dd className="tabular-nums">{sizeLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {uiLabel("evidenceUploaded", locale)}
            </dt>
            <dd className="tabular-nums text-muted-foreground">
              <time>{item.uploadedAt}</time>
            </dd>
          </div>
        </dl>

        <div className="space-y-2 rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-sm">
          <p className="font-medium">{uiLabel("evidenceLibraryReuseHeading", locale)}</p>
          <p className="text-muted-foreground">
            {uiLabel("evidenceLibraryReuseBody", locale)}
          </p>
          <Link
            href={`/assessment?locale=${locale}`}
            className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {uiLabel("evidenceLibraryAttachLink", locale)}
          </Link>
        </div>

        <div className="space-y-2">
          <Button
            size="sm"
            className="gap-2"
            disabled={!item.downloadable || isSummaryView || downloading}
            onClick={() => void handleDownload()}
            title={
              !item.downloadable
                ? uiLabel("evidenceDownloadBlocked", locale)
                : undefined
            }
          >
            <Download className="h-4 w-4" aria-hidden />
            {uiLabel("evidenceDownload", locale)}
          </Button>
          {!item.downloadable ? (
            <p className="text-xs text-muted-foreground">
              {uiLabel("evidenceQuarantineGate", locale)}
            </p>
          ) : !realWritesEnabled ? (
            <p className="text-xs text-muted-foreground">
              {uiLabel("demoDisabledHint", locale)}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
