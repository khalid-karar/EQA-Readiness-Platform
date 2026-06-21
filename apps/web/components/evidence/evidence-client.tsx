"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type {
  EvidencePresentation,
  PresentedEvidenceItem,
} from "@/lib/present-evidence";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ScreenAlertBanner } from "@/components/ui/screen-alert-banner";
import { StatusPill } from "@/components/ui/status-pill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EvidenceDetailSheet } from "@/components/evidence/evidence-detail-sheet";
import { WhatsNextPanel } from "@/components/orientation/whats-next-panel";
import { useDemoTableState } from "@/components/shell/use-demo-table-state";
import { useSyncShellMeta } from "@/components/shell/use-sync-shell-meta";
import { DEFAULT_TENANT_NAME } from "@/lib/nav-config";
import { uiLabel } from "@/lib/ui-labels";

interface EvidenceClientProps {
  presentation: EvidencePresentation;
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
}: EvidenceClientProps): ReactNode {
  const searchParams = useSearchParams();
  const { locale, isSummaryView } = presentation;
  const { rows, loading, error } = useDemoTableState(
    presentation.items,
    uiLabel("evidenceErrorDemo", locale),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

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
      setSheetOpen(true);
    }
  }, [searchParams, rows]);

  const columns: DataTableColumn<PresentedEvidenceItem>[] = useMemo(
    () => [
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
        id: "standard",
        header: uiLabel("standard", locale),
        accessor: (row) => (
          <div className="min-w-0">
            <p className="font-medium tabular-nums">{row.standardNumber}</p>
            <p className="truncate text-xs text-muted-foreground">
              {locale === "ar" ? row.standardTitleAr : row.standardTitleEn}
            </p>
          </div>
        ),
        sortValue: (row) => row.standardNumber,
        filterValue: (row) =>
          `${row.standardNumber} ${row.standardTitleEn} ${row.standardTitleAr}`,
      },
      {
        id: "ref",
        header: uiLabel("evidenceRef", locale),
        accessor: (row) => (
          <span className="font-mono text-xs text-muted-foreground">
            {locale === "ar" ? row.evidenceRefAr : row.evidenceRefEn}
          </span>
        ),
        sortValue: (row) => row.evidenceId,
        filterValue: (row) =>
          `${row.evidenceRefEn} ${row.evidenceRefAr} ${row.fileName}`,
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
    setSheetOpen(true);
  }, []);

  const quarantinedCount = rows.filter(
    (r) => r.scanStatus === "quarantined",
  ).length;

  const pendingActions =
    quarantinedCount > 0 && !isSummaryView
      ? [
          {
            id: "quarantined-evidence",
            count: quarantinedCount,
            label: uiLabel("evidenceWhatsNextAction", locale),
            priority: "high" as const,
          },
        ]
      : [];

  return (
    <div className="space-y-6">
      <ScreenAlertBanner
        variant="partial"
        title={uiLabel("evidenceQuarantineBanner", locale)}
      >
        <p>{uiLabel("evidenceQuarantineBannerBody", locale)}</p>
        <p className="mt-2 tabular-nums">
          {uiLabel("evidenceScanSummary", locale)}:{" "}
          <span className="font-semibold text-foreground">
            {presentation.clearedCount}
          </span>{' '}
          {uiLabel("evidenceClearedLabel", locale)} ·{" "}
          <span className="font-semibold text-readiness-partial">
            {presentation.quarantinedCount}
          </span>{' '}
          {uiLabel("evidenceQuarantinedLabel", locale)}
        </p>
      </ScreenAlertBanner>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>{uiLabel("evidenceTitle", locale)}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {uiLabel("evidenceSubtitle", locale)}
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={rows}
                getRowId={(row) => row.id}
                getRowAriaLabel={(row) =>
                  `${row.fileName}, ${row.standardNumber}, ${locale === "ar" ? row.scanLabelAr : row.scanLabelEn}`
                }
                selectedId={selectedId}
                onSelectRow={handleSelect}
                searchable
                searchPlaceholder={uiLabel("evidenceSearch", locale)}
                caption={uiLabel("evidenceTitle", locale)}
                loading={loading}
                error={error}
                emptyTitle={uiLabel("evidenceEmptyTitle", locale)}
                emptyDescription={uiLabel(
                  "evidenceEmptyDescription",
                  locale,
                )}
              />
            </CardContent>
          </Card>
        </div>

        <aside>
          <WhatsNextPanel
            locale={locale}
            isSummaryView={isSummaryView}
            pendingActions={pendingActions}
            summaryHint={uiLabel("evidenceBoardHint", locale)}
          />
        </aside>
      </div>

      <EvidenceDetailSheet
        item={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        locale={locale}
        isSummaryView={isSummaryView}
      />
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
