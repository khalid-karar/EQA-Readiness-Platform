"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type {
  EvidencePresentation,
  PresentedEvidenceItem,
} from "@/lib/present-evidence";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ScreenAlertBanner } from "@/components/ui/screen-alert-banner";
import { StatusPill } from "@/components/ui/status-pill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EvidenceLibraryPanel } from "@/components/evidence/evidence-library-panel";
import { WhatsNextPanel } from "@/components/orientation/whats-next-panel";
import { useDemoTableState } from "@/components/shell/use-demo-table-state";
import { useSyncShellMeta } from "@/components/shell/use-sync-shell-meta";
import { DEFAULT_TENANT_NAME } from "@/lib/nav-config";
import { uiLabel } from "@/lib/ui-labels";

interface EvidenceClientProps {
  presentation: EvidencePresentation;
  realWritesEnabled: boolean;
}

function scanPillVariant(
  status: PresentedEvidenceItem["scanStatus"],
): "conformant" | "unreviewed" | "gap" {
  if (status === "clean") return "conformant";
  if (status === "infected") return "gap";
  return "unreviewed";
}

function EvidenceClientInner({
  presentation,
  realWritesEnabled,
}: EvidenceClientProps): ReactNode {
  const searchParams = useSearchParams();
  const { locale, isSummaryView } = presentation;
  const { rows, loading, error } = useDemoTableState(
    presentation.items,
    uiLabel("evidenceErrorDemo", locale),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  useSyncShellMeta({
    locale,
    tenantName: DEFAULT_TENANT_NAME,
    assessmentName: presentation.assessmentName,
    location: selected
      ? selected.fileName
      : uiLabel("evidenceLocation", locale),
    roleLabel: presentation.roleLabel,
    isSummaryView,
  });

  useEffect(() => {
    const openId = searchParams.get("evidence");
    if (openId && rows.some((r) => r.id === openId)) {
      setSelectedId(openId);
    }
  }, [searchParams, rows]);

  const columns: DataTableColumn<PresentedEvidenceItem>[] = useMemo(
    () => [
      {
        id: "file",
        header: uiLabel("evidenceLibraryFileColumn", locale),
        accessor: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.fileName}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {locale === "ar" ? row.evidenceRefAr : row.evidenceRefEn}
            </p>
          </div>
        ),
        sortValue: (row) => row.fileName,
        filterValue: (row) =>
          `${row.fileName} ${row.evidenceRefEn} ${row.evidenceRefAr}`,
      },
      {
        id: "type",
        header: uiLabel("evidenceType", locale),
        accessor: (row) => (
          <span className="text-sm">
            {locale === "ar" ? row.typeLabelAr : row.typeLabelEn}
          </span>
        ),
        sortValue: (row) => row.typeLabelEn,
        filterValue: (row) => `${row.typeLabelEn} ${row.typeLabelAr}`,
      },
      {
        id: "standards",
        header: uiLabel("evidenceLibraryStandardsColumn", locale),
        accessor: (row) => (
          <div className="flex flex-wrap gap-1">
            {row.linkedStandards.map((mapping) => (
              <StatusPill key={mapping.standardNumber} variant="neutral" size="sm">
                {mapping.standardNumber}
              </StatusPill>
            ))}
            {row.reusedAcrossStandards ? (
              <StatusPill variant="neutral" size="sm">
                {uiLabel("evidenceLibraryReusedBadge", locale)}
              </StatusPill>
            ) : null}
          </div>
        ),
        sortValue: (row) => row.linkedStandards.map((s) => s.standardNumber).join(","),
        filterValue: (row) =>
          row.linkedStandards
            .flatMap((s) => [
              s.standardNumber,
              s.standardTitleEn,
              s.standardTitleAr,
            ])
            .join(" "),
      },
      {
        id: "scan",
        header: uiLabel("evidenceScanStatus", locale),
        accessor: (row) => (
          <StatusPill variant={scanPillVariant(row.scanStatus)}>
            {locale === "ar" ? row.scanLabelAr : row.scanLabelEn}
          </StatusPill>
        ),
        sortValue: (row) => row.scanStatus,
        filterValue: (row) =>
          `${row.scanLabelEn} ${row.scanLabelAr} ${row.scanStatus}`,
      },
    ],
    [locale],
  );

  const handleSelect = useCallback((row: PresentedEvidenceItem) => {
    setSelectedId(row.id);
  }, []);

  const quarantinedCount = rows.filter(
    (r) => r.scanStatus === "quarantined",
  ).length;
  const clearedCount = rows.filter((r) => r.scanStatus === "clean").length;
  const infectedCount = rows.filter((r) => r.scanStatus === "infected").length;
  const pendingQuarantineCount = quarantinedCount + infectedCount;
  const reusedCount = rows.filter((r) => r.reusedAcrossStandards).length;

  const pendingActions =
    pendingQuarantineCount > 0 && !isSummaryView
      ? [
          {
            id: "quarantined-evidence",
            count: pendingQuarantineCount,
            label: uiLabel("evidenceWhatsNextAction", locale),
            priority: "high" as const,
          },
        ]
      : [];

  return (
    <div className="space-y-6">
      <ScreenAlertBanner
        variant="partial"
        title={uiLabel("evidenceLibrarySecondaryBanner", locale)}
      >
        <p>{uiLabel("evidenceLibrarySecondaryBody", locale)}</p>
        <p className="mt-2">
          <Link
            href={`/assessment?locale=${locale}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {uiLabel("evidenceLibraryAttachLink", locale)}
          </Link>
        </p>
      </ScreenAlertBanner>

      <ScreenAlertBanner
        variant="partial"
        title={uiLabel("evidenceQuarantineBanner", locale)}
      >
        <p>{uiLabel("evidenceQuarantineBannerBody", locale)}</p>
        <p className="mt-2 tabular-nums">
          {uiLabel("evidenceScanSummary", locale)}:{" "}
          <span className="font-semibold text-foreground">{clearedCount}</span>{" "}
          {uiLabel("evidenceClearedLabel", locale)} ·{" "}
          <span className="font-semibold text-readiness-partial">
            {pendingQuarantineCount}
          </span>{" "}
          {uiLabel("evidenceQuarantinedLabel", locale)}
          {reusedCount > 0 ? (
            <>
              {" · "}
              <span className="font-semibold text-foreground">{reusedCount}</span>{" "}
              {uiLabel("evidenceLibraryReusedSummary", locale)}
            </>
          ) : null}
        </p>
      </ScreenAlertBanner>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>{uiLabel("evidenceTitle", locale)}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {uiLabel("evidenceLibrarySubtitle", locale)}
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={rows}
                getRowId={(row) => row.id}
                getRowAriaLabel={(row) =>
                  `${row.fileName}, ${row.linkedStandards.map((s) => s.standardNumber).join(", ")}, ${locale === "ar" ? row.scanLabelAr : row.scanLabelEn}`
                }
                selectedId={selectedId}
                onSelectRow={handleSelect}
                searchable
                searchPlaceholder={uiLabel("evidenceSearch", locale)}
                caption={uiLabel("evidenceTitle", locale)}
                loading={loading}
                error={error}
                emptyTitle={uiLabel("evidenceEmptyTitle", locale)}
                emptyDescription={uiLabel("evidenceEmptyDescription", locale)}
              />
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <EvidenceLibraryPanel
            item={selected}
            locale={locale}
            isSummaryView={isSummaryView}
            realWritesEnabled={realWritesEnabled}
          />
          <WhatsNextPanel
            locale={locale}
            isSummaryView={isSummaryView}
            pendingActions={pendingActions}
            summaryHint={uiLabel("evidenceBoardHint", locale)}
          />
        </aside>
      </div>
    </div>
  );
}

export function EvidenceClient(props: EvidenceClientProps): ReactNode {
  return (
    <Suspense fallback={null}>
      <EvidenceClientInner {...props} />
    </Suspense>
  );
}
