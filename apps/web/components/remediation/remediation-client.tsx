"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { ItemStatus } from "@eqa/workflows";
import { AlertTriangle } from "lucide-react";
import type {
  PresentedRemediationRow,
  RemediationPresentation,
} from "@/lib/present-remediation";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusPill, readinessVariantFromLevel } from "@/components/ui/status-pill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RemediationDetailSheet } from "@/components/remediation/remediation-detail-sheet";
import { WhatsNextPanel } from "@/components/orientation/whats-next-panel";
import { useSyncShellMeta } from "@/components/shell/use-sync-shell-meta";
import { DEFAULT_TENANT_NAME } from "@/lib/nav-config";
import { uiLabel } from "@/lib/ui-labels";
import { uxStatusLevel } from "@/lib/status-level";
import {
  daysOverdue,
  isRemediationOverdue,
} from "@eqa/workflows/remediation-pure";
import { remediationScheduleLabel } from "@/lib/remediation-display";
import { cn } from "@/lib/utils";

/** Matches Seera demo reference date — client-safe constant (no @eqa/workflows main import). */
const DEMO_REFERENCE_DATE = "2026-06-19T12:00:00.000Z";

interface RemediationClientProps {
  presentation: RemediationPresentation;
}

function isClosedStatus(status: ItemStatus): boolean {
  return status === "closed_ready" || status === "not_applicable";
}

function RemediationClientInner({
  presentation,
}: RemediationClientProps): ReactNode {
  const searchParams = useSearchParams();
  const {
    locale,
    isSummaryView,
    canOperate,
    assessmentName,
    roleLabel,
    pendingActions,
    statusLabels,
  } = presentation;

  const [rows, setRows] = useState<PresentedRemediationRow[]>(() => [
    ...presentation.rows,
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(
    searchParams.get("demo") === "loading",
  );
  const error =
    searchParams.get("demo") === "error"
      ? uiLabel("remediationErrorDemo", locale)
      : null;

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  useSyncShellMeta({
    locale,
    tenantName: DEFAULT_TENANT_NAME,
    assessmentName,
    location: selected
      ? `${selected.standardNumber} — ${selected.standardTitle}`
      : uiLabel("remediationLocation", locale),
    roleLabel,
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
    const openId = searchParams.get("remediation");
    if (openId && rows.some((r) => r.id === openId)) {
      setSelectedId(openId);
      setSheetOpen(true);
    }
  }, [searchParams, rows]);

  const openCount = rows.filter(
    (r) => !isClosedStatus(r.itemStatus),
  ).length;
  const overdueCount = rows.filter(
    (r) => r.isOverdue && !isClosedStatus(r.itemStatus),
  ).length;

  const handleStatusChange = useCallback(
    (remediationId: string, status: ItemStatus) => {
      setRows((prev) =>
        prev.map((row) => {
          if (row.remediationId !== remediationId) return row;
          const closed = isClosedStatus(status);
          const isOverdue = isRemediationOverdue(
            row.targetDate,
            status,
            DEMO_REFERENCE_DATE,
          );
          const overdueDays = daysOverdue(
            row.targetDate,
            status,
            DEMO_REFERENCE_DATE,
          );
          return {
            ...row,
            itemStatus: status,
            statusLabel: statusLabels[status],
            isOverdue,
            daysOverdue: overdueDays,
            scheduleLabelEn: remediationScheduleLabel(
              "en",
              isOverdue,
              closed,
              overdueDays,
            ),
            scheduleLabelAr: remediationScheduleLabel(
              "ar",
              isOverdue,
              closed,
              overdueDays,
            ),
            closedAt: closed ? DEMO_REFERENCE_DATE : null,
          };
        }),
      );
    },
    [statusLabels],
  );

  const columns: DataTableColumn<PresentedRemediationRow>[] = useMemo(() => {
    if (isSummaryView) {
      return [
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
          id: "status",
          header: uiLabel("status", locale),
          accessor: (row) => (
            <StatusPill
              variant={readinessVariantFromLevel(uxStatusLevel(row.itemStatus))}
            >
              {row.statusLabel}
            </StatusPill>
          ),
          sortValue: (row) => row.itemStatus,
          filterValue: (row) => row.statusLabel,
        },
        {
          id: "schedule",
          header: uiLabel("schedule", locale),
          accessor: (row) => {
            const closed = isClosedStatus(row.itemStatus);
            const label =
              locale === "ar" ? row.scheduleLabelAr : row.scheduleLabelEn;
            const variant = closed
              ? "conformant"
              : row.isOverdue
                ? "gap"
                : "partial";
            return <StatusPill variant={variant} size="sm">{label}</StatusPill>;
          },
          sortValue: (row) =>
            locale === "ar" ? row.scheduleLabelAr : row.scheduleLabelEn,
          filterValue: (row) =>
            `${row.scheduleLabelEn} ${row.scheduleLabelAr}`,
        },
      ];
    }

    return [
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
        id: "owner",
        header: uiLabel("owner", locale),
        accessor: (row) => row.owner,
        sortValue: (row) => row.owner,
        filterValue: (row) => row.owner,
      },
      {
        id: "due",
        header: uiLabel("remediationDue", locale),
        accessor: (row) => (
          <span
            className={cn(
              "tabular-nums",
              row.isOverdue && !isClosedStatus(row.itemStatus) &&
                "font-medium text-readiness-gap",
            )}
          >
            {row.targetDate}
          </span>
        ),
        sortValue: (row) => row.targetDate,
        filterValue: (row) => row.targetDate,
      },
      {
        id: "status",
        header: uiLabel("status", locale),
        accessor: (row) => (
          <StatusPill
            variant={readinessVariantFromLevel(uxStatusLevel(row.itemStatus))}
          >
            {row.statusLabel}
          </StatusPill>
        ),
        sortValue: (row) => row.itemStatus,
        filterValue: (row) => row.statusLabel,
      },
    ];
  }, [isSummaryView, locale]);

  const handleSelect = useCallback((row: PresentedRemediationRow) => {
    setSelectedId(row.id);
    setSheetOpen(true);
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {uiLabel("openGaps", locale)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{openCount}</p>
          </CardContent>
        </Card>
        <Card
          className={overdueCount > 0 ? "ring-2 ring-readiness-red/40" : ""}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              {overdueCount > 0 ? (
                <AlertTriangle
                  className="h-4 w-4 text-readiness-red"
                  aria-hidden
                />
              ) : null}
              {uiLabel("overdue", locale)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                "text-3xl font-bold",
                overdueCount > 0 && "text-readiness-red",
              )}
            >
              {overdueCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>{uiLabel("remediationTitle", locale)}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {uiLabel("remediationSubtitle", locale)}
              </p>
              <p className="text-xs text-muted-foreground">
                {isSummaryView
                  ? uiLabel("boardRemediationTableHint", locale)
                  : uiLabel("selectRowHint", locale)}
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
                searchPlaceholder={uiLabel("remediationSearch", locale)}
                loading={loading}
                error={error}
                emptyTitle={uiLabel("remediationEmptyTitle", locale)}
                emptyDescription={uiLabel("remediationEmptyDescription", locale)}
              />
            </CardContent>
          </Card>
        </div>

        <aside>
          <WhatsNextPanel
            locale={locale}
            isSummaryView={isSummaryView}
            pendingActions={pendingActions}
            summaryHint={uiLabel("remediationSummaryHint", locale)}
          />
        </aside>
      </div>

      <RemediationDetailSheet
        row={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        locale={locale}
        isSummaryView={isSummaryView}
        canOperate={canOperate}
        statusLabel={
          selected ? statusLabels[selected.itemStatus] : ""
        }
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}

export function RemediationClient(props: RemediationClientProps): ReactNode {
  return (
    <Suspense fallback={null}>
      <RemediationClientInner {...props} />
    </Suspense>
  );
}
