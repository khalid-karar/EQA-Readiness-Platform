"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { ItemStatus } from "@eqa/workflows";
import { AlertTriangle } from "lucide-react";
import type {
  PresentedLinkedEvidence,
  PresentedRemediationRow,
  RemediationPresentation,
} from "@/lib/present-remediation";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusPill, readinessVariantFromLevel } from "@/components/ui/status-pill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RemediationWorkspacePanel } from "@/components/remediation/remediation-workspace-panel";
import { WhatsNextPanel } from "@/components/orientation/whats-next-panel";
import { useDemoTableState } from "@/components/shell/use-demo-table-state";
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

const DEMO_REFERENCE_DATE = "2026-06-19T12:00:00.000Z";

interface RemediationClientProps {
  presentation: RemediationPresentation;
  realWritesEnabled: boolean;
}

function isClosedStatus(status: ItemStatus): boolean {
  return status === "closed_ready" || status === "not_applicable";
}

function RemediationClientInner({
  presentation,
  realWritesEnabled,
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

  const { rows, loading, error, setRows } = useDemoTableState(
    presentation.rows,
    uiLabel("remediationErrorDemo", locale),
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    presentation.rows[0]?.id ?? null,
  );

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
    const openId = searchParams.get("remediation");
    if (openId && rows.some((r) => r.id === openId)) {
      setSelectedId(openId);
    }
  }, [searchParams, rows]);

  const openCount = rows.filter((r) => !isClosedStatus(r.itemStatus)).length;
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
            hadRetestFailure:
              status === "under_human_review" ? true : row.hadRetestFailure,
            retestNote:
              status === "under_human_review" && row.retestNote == null
                ? "Retest failed — returned to human review"
                : row.retestNote,
          };
        }),
      );
    },
    [locale, statusLabels, setRows],
  );

  const handleRowUpdate = useCallback(
    (remediationId: string, patch: Partial<PresentedRemediationRow>) => {
      setRows((prev) =>
        prev.map((row) =>
          row.remediationId === remediationId ? { ...row, ...patch } : row,
        ),
      );
    },
    [setRows],
  );

  const handleEvidenceAdded = useCallback(
    (remediationId: string, evidence: PresentedLinkedEvidence) => {
      setRows((prev) =>
        prev.map((row) =>
          row.remediationId === remediationId
            ? {
                ...row,
                linkedEvidence: [...row.linkedEvidence, evidence],
              }
            : row,
        ),
      );
    },
    [setRows],
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
  }, []);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {uiLabel("remediationTitle", locale)}
        </h1>
        <p className="text-sm text-muted-foreground">
          {uiLabel("remediationSubtitle", locale)}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {uiLabel("openGaps", locale)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{openCount}</p>
          </CardContent>
        </Card>
        <Card className={overdueCount > 0 ? "ring-2 ring-readiness-gap/40" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              {overdueCount > 0 ? (
                <AlertTriangle
                  className="h-4 w-4 text-readiness-gap"
                  aria-hidden
                />
              ) : null}
              {uiLabel("overdue", locale)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                "text-3xl font-bold tabular-nums",
                overdueCount > 0 && "text-readiness-gap",
              )}
            >
              {overdueCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(16rem,20rem)]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{uiLabel("openGaps", locale)}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {uiLabel("remediationWorkspaceSelectHint", locale)}
            </p>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={rows}
              getRowId={(row) => row.id}
              getRowAriaLabel={(row) =>
                `${row.standardNumber} — ${row.standardTitle}, ${row.statusLabel}`
              }
              selectedId={selectedId}
              onSelectRow={handleSelect}
              searchable
              searchPlaceholder={uiLabel("remediationSearch", locale)}
              caption={uiLabel("remediationTitle", locale)}
              loading={loading}
              error={error}
              emptyTitle={uiLabel("remediationEmptyTitle", locale)}
              emptyDescription={uiLabel("remediationEmptyDescription", locale)}
            />
          </CardContent>
        </Card>

        <RemediationWorkspacePanel
          row={selected}
          locale={locale}
          isSummaryView={isSummaryView}
          canOperate={canOperate}
          realWritesEnabled={realWritesEnabled}
          statusLabel={selected ? statusLabels[selected.itemStatus] : ""}
          onRowUpdate={handleRowUpdate}
          onStatusChange={handleStatusChange}
          onEvidenceAdded={handleEvidenceAdded}
        />

        <aside>
          <WhatsNextPanel
            locale={locale}
            isSummaryView={isSummaryView}
            pendingActions={pendingActions}
            summaryHint={uiLabel("remediationSummaryHint", locale)}
          />
        </aside>
      </div>
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
