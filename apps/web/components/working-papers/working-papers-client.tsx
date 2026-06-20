"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type {
  PresentedWorkingPaperItem,
  WorkingPapersPresentation,
} from "@/lib/present-working-papers";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusPill } from "@/components/ui/status-pill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkingPaperDetailSheet } from "@/components/working-papers/working-paper-detail-sheet";
import { WhatsNextPanel } from "@/components/orientation/whats-next-panel";
import { useSyncShellMeta } from "@/components/shell/use-sync-shell-meta";
import { DEFAULT_TENANT_NAME } from "@/lib/nav-config";
import { uiLabel } from "@/lib/ui-labels";

interface WorkingPapersClientProps {
  presentation: WorkingPapersPresentation;
}

function conformancePillVariant(
  status: PresentedWorkingPaperItem["conformance"],
): "conformant" | "partial" | "gap" | "unreviewed" {
  if (status === "conformant") return "conformant";
  if (status === "partial") return "partial";
  if (status === "non_conformant") return "gap";
  return "unreviewed";
}

function WorkingPapersClientInner({
  presentation,
}: WorkingPapersClientProps): ReactNode {
  const searchParams = useSearchParams();
  const { locale, isSummaryView } = presentation;
  const [rows, setRows] = useState<PresentedWorkingPaperItem[]>(() => [
    ...presentation.items,
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(
    searchParams.get("demo") === "loading",
  );
  const error =
    searchParams.get("demo") === "error"
      ? uiLabel("wpErrorDemo", locale)
      : null;

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  useSyncShellMeta({
    locale,
    tenantName: DEFAULT_TENANT_NAME,
    assessmentName: presentation.assessmentName,
    location: selected
      ? selected.workingPaperRef
      : uiLabel("wpLocation", locale),
    roleLabel: presentation.roleLabel,
    isSummaryView,
  });

  useEffect(() => {
    if (searchParams.get("demo") === "loading") {
      const t = setTimeout(() => setLoading(false), 800);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("demo") === "empty") {
      setRows([]);
    }
  }, [searchParams]);

  useEffect(() => {
    const openId = searchParams.get("item");
    if (openId && rows.some((r) => r.id === openId)) {
      setSelectedId(openId);
      setSheetOpen(true);
    }
  }, [searchParams, rows]);

  const columns: DataTableColumn<PresentedWorkingPaperItem>[] = useMemo(
    () => [
      {
        id: "engagement",
        header: uiLabel("wpEngagement", locale),
        accessor: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {locale === "ar"
                ? row.engagementTitleAr
                : row.engagementTitleEn}
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {row.workingPaperRef}
            </p>
          </div>
        ),
        sortValue: (row) => row.workingPaperRef,
        filterValue: (row) =>
          `${row.engagementTitleEn} ${row.engagementTitleAr} ${row.workingPaperRef}`,
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
        id: "item",
        header: uiLabel("wpChecklistItem", locale),
        accessor: (row) => (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {locale === "ar" ? row.itemTextAr : row.itemTextEn}
          </p>
        ),
        sortValue: (row) => row.itemId,
        filterValue: (row) =>
          `${row.itemTextEn} ${row.itemTextAr} ${row.itemId}`,
      },
      {
        id: "conformance",
        header: uiLabel("wpConformance", locale),
        accessor: (row) => (
          <StatusPill variant={conformancePillVariant(row.conformance)}>
            {locale === "ar"
              ? row.conformanceLabelAr
              : row.conformanceLabelEn}
          </StatusPill>
        ),
        sortValue: (row) => row.conformance,
        filterValue: (row) =>
          `${row.conformanceLabelEn} ${row.conformanceLabelAr} ${row.conformance}`,
      },
    ],
    [locale],
  );

  const handleSelect = useCallback((row: PresentedWorkingPaperItem) => {
    setSelectedId(row.id);
    setSheetOpen(true);
  }, []);

  const unreviewedCount = rows.filter(
    (r) => r.conformance === "unreviewed",
  ).length;

  const pendingActions =
    unreviewedCount > 0 && !isSummaryView
      ? [
          {
            id: "wp-unreviewed",
            count: unreviewedCount,
            label: uiLabel("wpWhatsNextAction", locale),
            priority: "high" as const,
          },
        ]
      : [];

  const engagementTitle =
    locale === "ar"
      ? presentation.engagementTitleAr
      : presentation.engagementTitleEn;
  const periodLabel =
    locale === "ar" ? presentation.periodLabelAr : presentation.periodLabelEn;
  const sampleRationale =
    locale === "ar"
      ? presentation.sampleRationaleAr
      : presentation.sampleRationaleEn;

  return (
    <div className="space-y-6">
      <Card className="border-readiness-unreviewed/30 bg-readiness-unreviewed-bg/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-readiness-unreviewed">
            {uiLabel("wpUnreviewedBanner", locale)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">{sampleRationale}</p>
          <p className="tabular-nums">
            <span className="font-semibold text-readiness-unreviewed">
              {unreviewedCount}
            </span>{' '}
            {uiLabel("wpUnreviewedRollup", locale)} ·{" "}
            <span className="font-semibold text-foreground">
              {presentation.reviewedCount}
            </span>
            /{presentation.totalCount}{' '}
            {uiLabel("wpReviewedRollup", locale)}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <StatusPill variant="conformant" size="sm">
              {presentation.conformantCount}{' '}
              {uiLabel("wpConformantLabel", locale)}
            </StatusPill>
            <StatusPill variant="partial" size="sm">
              {presentation.partialCount}{' '}
              {uiLabel("wpPartialLabel", locale)}
            </StatusPill>
            <StatusPill variant="gap" size="sm">
              {presentation.nonConformantCount}{' '}
              {uiLabel("wpNonConformantLabel", locale)}
            </StatusPill>
            <StatusPill variant="unreviewed" size="sm">
              {unreviewedCount} {uiLabel("unreviewed", locale)}
            </StatusPill>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>{uiLabel("wpTitle", locale)}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {engagementTitle} · {periodLabel}
              </p>
              <p className="text-sm text-muted-foreground">
                {uiLabel("wpSubtitle", locale)}
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={rows}
                getRowId={(row) => row.id}
                selectedId={selectedId}
                onSelectRow={handleSelect}
                searchable
                searchPlaceholder={uiLabel("wpSearch", locale)}
                loading={loading}
                error={error}
                emptyTitle={uiLabel("wpEmptyTitle", locale)}
                emptyDescription={uiLabel("wpEmptyDescription", locale)}
              />
            </CardContent>
          </Card>
        </div>

        <aside>
          <WhatsNextPanel
            locale={locale}
            isSummaryView={isSummaryView}
            pendingActions={pendingActions}
            summaryHint={uiLabel("wpBoardHint", locale)}
          />
        </aside>
      </div>

      <WorkingPaperDetailSheet
        item={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        locale={locale}
        isSummaryView={isSummaryView}
      />
    </div>
  );
}

export function WorkingPapersClient(props: WorkingPapersClientProps): ReactNode {
  return (
    <Suspense fallback={null}>
      <WorkingPapersClientInner {...props} />
    </Suspense>
  );
}
