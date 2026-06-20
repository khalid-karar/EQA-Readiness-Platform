"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Download } from "lucide-react";
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
import type { PresentedEvidenceItem } from "@/lib/present-evidence";
import { uiLabel } from "@/lib/ui-labels";

interface EvidenceDetailSheetProps {
  item: PresentedEvidenceItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: "en" | "ar";
  isSummaryView: boolean;
}

function scanPillVariant(
  status: PresentedEvidenceItem["scanStatus"],
): "conformant" | "unreviewed" | "gap" {
  if (status === "clean") return "conformant";
  if (status === "infected") return "gap";
  return "unreviewed";
}

export function EvidenceDetailSheet({
  item,
  open,
  onOpenChange,
  locale,
  isSummaryView,
}: EvidenceDetailSheetProps): ReactNode {
  if (!item) return null;

  const scanLabel = locale === "ar" ? item.scanLabelAr : item.scanLabelEn;
  const quarantineNote =
    locale === "ar" ? item.quarantineNoteAr : item.quarantineNoteEn;
  const typeLabel = locale === "ar" ? item.typeLabelAr : item.typeLabelEn;
  const sizeLabel = locale === "ar" ? item.sizeLabelAr : item.sizeLabelEn;
  const evidenceRef =
    locale === "ar" ? item.evidenceRefAr : item.evidenceRefEn;
  const standardTitle =
    locale === "ar" ? item.standardTitleAr : item.standardTitleEn;

  return (
    <SideSheet open={open} onOpenChange={onOpenChange}>
      <SideSheetContent
        side={detailPanelSide(locale)}
        aria-describedby="evidence-sheet-desc"
      >
        <SideSheetHeader>
          <div className="min-w-0 space-y-1 pe-2">
            <SideSheetTitle className="truncate">{item.fileName}</SideSheetTitle>
            <SideSheetDescription id="evidence-sheet-desc">
              {uiLabel("evidenceDetailSubtitle", locale)} · {evidenceRef}
            </SideSheetDescription>
          </div>
          <SideSheetCloseButton aria-label={uiLabel("closePanel", locale)} />
        </SideSheetHeader>

        <SideSheetBody className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill variant={scanPillVariant(item.scanStatus)}>
              {scanLabel}
            </StatusPill>
            <StatusPill variant="neutral" size="sm">{typeLabel}</StatusPill>
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
                {uiLabel("evidenceRef", locale)}
              </dt>
              <dd className="font-mono text-xs">{evidenceRef}</dd>
            </div>
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

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {uiLabel("evidenceLinks", locale)}
            </p>
            <ul className="flex flex-wrap gap-2">
              {item.links.map((link) => (
                <li key={link}>
                  <StatusPill variant="neutral" size="sm">{link}</StatusPill>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <Button
              size="sm"
              disabled={!item.downloadable || isSummaryView}
              className="gap-2"
              title={
                !item.downloadable
                  ? uiLabel("evidenceDownloadBlocked", locale)
                  : uiLabel("demoDisabledHint", locale)
              }
            >
              <Download className="h-4 w-4" aria-hidden />
              {uiLabel("evidenceDownload", locale)}
            </Button>
            {!item.downloadable ? (
              <p className="text-xs text-muted-foreground">
                {uiLabel("evidenceQuarantineGate", locale)}
              </p>
            ) : null}
          </div>
        </SideSheetBody>
      </SideSheetContent>
    </SideSheet>
  );
}
