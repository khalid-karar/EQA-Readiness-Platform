"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { FindingsPresentation, PresentedFinding } from "@/lib/present-findings";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusPill } from "@/components/ui/status-pill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FindingDetailSheet } from "@/components/findings/finding-detail-sheet";
import { useSyncShellMeta } from "@/components/shell/use-sync-shell-meta";
import { DEFAULT_TENANT_NAME } from "@/lib/nav-config";
import { uiLabel } from "@/lib/ui-labels";

interface FindingsClientProps {
  presentation: FindingsPresentation;
}

function statusPillVariant(
  status: PresentedFinding["status"],
): "partial" | "gap" | "conformant" {
  if (status === "pending_review") return "partial";
  if (status === "gap_confirmed") return "gap";
  return "conformant";
}

function FindingsClientInner({
  presentation,
}: FindingsClientProps): ReactNode {
  const searchParams = useSearchParams();
  const { locale, canReview, isSummaryView } = presentation;
  const [rows, setRows] = useState<PresentedFinding[]>(() => [
    ...presentation.findings,
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(
    searchParams.get("demo") === "loading",
  );
  const error =
    searchParams.get("demo") === "error"
      ? uiLabel("findingsErrorDemo", locale)
      : null;

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  useSyncShellMeta({
    locale,
    tenantName: DEFAULT_TENANT_NAME,
    assessmentName: presentation.assessmentName,
    location: selected
      ? `${selected.standardNumber} — ${selected.standardTitle}`
      : uiLabel("findingsLocation", locale),
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
    const openId = searchParams.get("finding");
    if (openId && rows.some((r) => r.id === openId)) {
      setSelectedId(openId);
      setSheetOpen(true);
    }
  }, [searchParams, rows]);

  const columns: DataTableColumn<PresentedFinding>[] = useMemo(
    () => [
      {
        id: "status",
        header: uiLabel("status", locale),
        accessor: (row) => (
          <StatusPill variant={statusPillVariant(row.status)}>
            {locale === "ar" ? row.statusLabelAr : row.statusLabelEn}
          </StatusPill>
        ),
        sortValue: (row) => row.status,
        filterValue: (row) =>
          `${row.statusLabelEn} ${row.statusLabelAr} ${row.status}`,
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
        id: "source",
        header: uiLabel("findingSource", locale),
        accessor: (row) => (
          <StatusPill variant="neutral" size="sm">
            {locale === "ar" ? row.sourceLabelAr : row.sourceLabelEn}
          </StatusPill>
        ),
        sortValue: (row) => row.source,
        filterValue: (row) => `${row.sourceLabelEn} ${row.sourceLabelAr}`,
      },
      {
        id: "age",
        header: uiLabel("findingAge", locale),
        accessor: (row) => (
          <span className="tabular-nums text-muted-foreground">
            {locale === "ar" ? row.ageLabelAr : row.ageLabelEn}
          </span>
        ),
        sortValue: (row) => row.ageDays,
        filterValue: (row) =>
          `${row.ageLabelEn} ${row.ageLabelAr} ${row.ageDays}`,
      },
    ],
    [locale],
  );

  const handleSelect = useCallback((row: PresentedFinding) => {
    setSelectedId(row.id);
    setSheetOpen(true);
  }, []);

  const handleResolved = useCallback(
    (
      findingId: string,
      status: PresentedFinding["status"],
      conclusion: string | null,
    ) => {
      setRows((prev) =>
        prev.map((row) => {
          if (row.findingId !== findingId) return row;
          const text = conclusion ?? row.conclusionText;
          const updated: PresentedFinding = {
            id: row.id,
            findingId: row.findingId,
            standardNumber: row.standardNumber,
            standardTitle: row.standardTitle,
            questionId: row.questionId,
            status,
            statusLabelEn:
              status === "gap_confirmed" ? "Gap confirmed" : "No gap",
            statusLabelAr:
              status === "gap_confirmed" ? "فجوة مؤكدة" : "لا توجد فجوة",
            source: "human",
            sourceLabelEn: "Human review",
            sourceLabelAr: "مراجعة بشرية",
            ageDays: row.ageDays,
            ageLabelEn: row.ageLabelEn,
            ageLabelAr: row.ageLabelAr,
            resolved: true,
            ...(text !== undefined ? { conclusionText: text } : {}),
          };
          return updated;
        }),
      );
    },
    [],
  );

  const pendingCount = rows.filter((r) => !r.resolved).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>{uiLabel("findingsTitle", locale)}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {uiLabel("findingsSubtitle", locale)}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {uiLabel("findingsPendingCount", locale)}:{" "}
            <span className="font-semibold text-foreground">{pendingCount}</span>
          </p>

          <DataTable
            columns={columns}
            data={rows}
            getRowId={(row) => row.id}
            selectedId={selectedId}
            onSelectRow={handleSelect}
            searchable
            searchPlaceholder={uiLabel("findingsSearch", locale)}
            loading={loading}
            error={error}
            emptyTitle={uiLabel("findingsEmptyTitle", locale)}
            emptyDescription={uiLabel("findingsEmptyDescription", locale)}
          />
        </CardContent>
      </Card>

      <FindingDetailSheet
        finding={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        locale={locale}
        canReview={canReview}
        onResolved={handleResolved}
      />
    </div>
  );
}

export function FindingsClient(props: FindingsClientProps): ReactNode {
  return (
    <Suspense fallback={null}>
      <FindingsClientInner {...props} />
    </Suspense>
  );
}
