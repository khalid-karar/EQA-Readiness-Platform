"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { MockEqaPresentation, PresentedStandardRow } from "@/lib/present-mock-eqa";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { SimulationDisclaimerBanner } from "@/components/mock-eqa/simulation-disclaimer";
import { MockEqaDetailSheet } from "@/components/mock-eqa/mock-eqa-detail-sheet";
import { WhatsNextPanel } from "@/components/orientation/whats-next-panel";
import { useSyncShellMeta } from "@/components/shell/use-sync-shell-meta";
import { DEFAULT_TENANT_NAME } from "@/lib/nav-config";
import { uiLabel } from "@/lib/ui-labels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill, readinessVariantFromLevel } from "@/components/ui/status-pill";
import { cn } from "@/lib/utils";

interface MockEqaClientProps {
  presentation: MockEqaPresentation;
}

function MockEqaClientInner({
  presentation,
}: MockEqaClientProps): ReactNode {
  const searchParams = useSearchParams();
  const { view, roleLabel, overallScore, overallLevel, overallLabel } =
    presentation;
  const locale = view.locale;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(
    searchParams.get("demo") === "loading",
  );
  const error =
    searchParams.get("demo") === "error"
      ? uiLabel("mockEqaErrorDemo", locale)
      : null;

  const selected =
    presentation.standardRows.find((r) => r.id === selectedId) ?? null;

  useSyncShellMeta({
    locale,
    tenantName: DEFAULT_TENANT_NAME,
    assessmentName: view.assessmentName,
    location: selected
      ? `${uiLabel("standard", locale)} ${selected.standardNumber}`
      : uiLabel("mockEqaLocation", locale),
    roleLabel,
    isSummaryView: view.isSummaryView,
  });

  useEffect(() => {
    if (searchParams.get("demo") === "loading") {
      const t = setTimeout(() => setLoading(false), 800);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [searchParams]);

  useEffect(() => {
    const openId = searchParams.get("standard");
    if (openId && presentation.standardRows.some((r) => r.id === openId)) {
      setSelectedId(openId);
      setSheetOpen(true);
    }
  }, [searchParams, presentation.standardRows]);

  const pendingActions = view.isSummaryView
    ? []
    : [
        {
          id: "run-simulation",
          count: 1,
          label: uiLabel("mockEqaRunPending", locale),
          priority: "medium" as const,
        },
      ];

  const columns: DataTableColumn<PresentedStandardRow>[] = useMemo(
    () => [
      {
        id: "domain",
        header: uiLabel("mockEqaDomain", locale),
        accessor: (row) => (
          <div className="min-w-0">
            <p className="font-medium tabular-nums">{row.domainNumber}</p>
            <p className="truncate text-xs text-muted-foreground">
              {row.domainTitle}
            </p>
          </div>
        ),
        sortValue: (row) => row.domainNumber,
        filterValue: (row) => `${row.domainNumber} ${row.domainTitle}`,
      },
      {
        id: "standard",
        header: uiLabel("standard", locale),
        accessor: (row) => (
          <div className="min-w-0">
            <p className="font-medium tabular-nums">{row.standardNumber}</p>
            <p className="truncate text-xs text-muted-foreground">
              {row.standardTitle}
            </p>
          </div>
        ),
        sortValue: (row) => row.standardNumber,
        filterValue: (row) => `${row.standardNumber} ${row.standardTitle}`,
      },
      {
        id: "rating",
        header: uiLabel("mockEqaRating", locale),
        accessor: (row) => (
          <StatusPill variant={readinessVariantFromLevel(row.ratingLevel)}>
            {row.ratingScore}% · {row.ratingLabel}
          </StatusPill>
        ),
        sortValue: (row) => row.ratingScore,
        filterValue: (row) => `${row.ratingLabel} ${row.ratingScore}`,
      },
      {
        id: "gaps",
        header: uiLabel("mockEqaGaps", locale),
        accessor: (row) =>
          row.drivingGapCount > 0 ? (
            <span className="tabular-nums text-readiness-gap">
              {row.drivingGapCount}
            </span>
          ) : (
            <span className="text-readiness-conformant">
              {uiLabel("mockEqaNoGaps", locale)}
            </span>
          ),
        sortValue: (row) => row.drivingGapCount,
        filterValue: (row) => String(row.drivingGapCount),
      },
    ],
    [locale],
  );

  const handleSelect = useCallback((row: PresentedStandardRow) => {
    setSelectedId(row.id);
    setSheetOpen(true);
  }, []);

  return (
    <div className="space-y-6">
      <SimulationDisclaimerBanner presentation={presentation} />

      <Card
        className={cn(
          "ring-2",
          overallLevel === "green" && "ring-readiness-green/40",
          overallLevel === "amber" && "ring-readiness-amber/40",
          overallLevel === "red" && "ring-readiness-red/40",
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{uiLabel("mockEqaOverallTitle", locale)}</CardTitle>
            <StatusPill variant="partial" size="sm">
              {uiLabel("mockEqaSimulationBadge", locale)}
            </StatusPill>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-6">
            <div
              className={cn(
                "flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full text-white",
                overallLevel === "green" && "bg-readiness-green",
                overallLevel === "amber" && "bg-readiness-amber",
                overallLevel === "red" && "bg-readiness-red",
              )}
              role="img"
              aria-label={`${overallLabel}: ${overallScore}%`}
            >
              <span className="text-3xl font-bold">{overallScore}%</span>
            </div>
            <div className="space-y-2">
              <p
                className={cn(
                  "text-2xl font-semibold",
                  overallLevel === "green" && "text-readiness-green",
                  overallLevel === "amber" && "text-readiness-amber",
                  overallLevel === "red" && "text-readiness-red",
                )}
              >
                {overallLabel}
              </p>
              <p className="text-sm text-muted-foreground">
                {uiLabel("mockEqaOverallHint", locale)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>{uiLabel("mockEqaBreakdownTitle", locale)}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {uiLabel("mockEqaBreakdownSubtitle", locale)}
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={presentation.standardRows}
                getRowId={(row) => row.id}
                selectedId={selectedId}
                onSelectRow={handleSelect}
                searchable
                searchPlaceholder={uiLabel("mockEqaSearch", locale)}
                loading={loading}
                error={error}
                emptyTitle={uiLabel("mockEqaEmptyTitle", locale)}
                emptyDescription={uiLabel("mockEqaEmptyDescription", locale)}
              />
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          {view.canRunSimulation ? (
            <Card>
              <CardContent className="space-y-3 pt-6">
                <p className="text-sm text-muted-foreground">
                  {uiLabel("mockEqaRunHint", locale)}
                </p>
                <Button
                  size="sm"
                  disabled
                  title={uiLabel("demoDisabledHint", view.locale)}
                >
                  {uiLabel("mockEqaRunButton", locale)}
                </Button>
              </CardContent>
            </Card>
          ) : null}
          <WhatsNextPanel
            locale={locale}
            isSummaryView={view.isSummaryView}
            pendingActions={pendingActions}
            summaryHint={uiLabel("mockEqaBoardHint", locale)}
          />
        </aside>
      </div>

      <MockEqaDetailSheet
        row={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        locale={locale}
      />
    </div>
  );
}

export function MockEqaClient(props: MockEqaClientProps): ReactNode {
  return (
    <Suspense fallback={null}>
      <MockEqaClientInner {...props} />
    </Suspense>
  );
}
