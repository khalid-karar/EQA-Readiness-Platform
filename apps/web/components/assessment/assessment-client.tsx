"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type {
  AssessmentPresentation,
  PresentedAssessmentStandard,
} from "@/lib/present-assessment";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusPill, readinessVariantFromLevel } from "@/components/ui/status-pill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuestionDetailSheet } from "@/components/assessment/question-detail-sheet";
import { WhatsNextPanel } from "@/components/orientation/whats-next-panel";
import { useDemoTableState } from "@/components/shell/use-demo-table-state";
import { useSyncShellMeta } from "@/components/shell/use-sync-shell-meta";
import { ScreenAlertBanner } from "@/components/ui/screen-alert-banner";
import { DEFAULT_TENANT_NAME } from "@/lib/nav-config";
import { uxStatusLevel } from "@/lib/status-level";
import { uiLabel } from "@/lib/ui-labels";

interface AssessmentClientProps {
  presentation: AssessmentPresentation;
  realWritesEnabled: boolean;
}

function AssessmentClientInner({
  presentation,
  realWritesEnabled,
}: AssessmentClientProps): ReactNode {
  const searchParams = useSearchParams();
  const { locale, isSummaryView } = presentation;
  const { rows, loading, error, setRows } = useDemoTableState(
    presentation.standards,
    uiLabel("assessmentErrorDemo", locale),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    null,
  );
  const [sheetOpen, setSheetOpen] = useState(false);

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  useSyncShellMeta({
    locale,
    tenantName: DEFAULT_TENANT_NAME,
    assessmentName: presentation.assessmentName,
    location: selected
      ? `${selected.standardNumber} — ${selected.standardTitle}`
      : uiLabel("assessmentLocation", locale),
    roleLabel: presentation.roleLabel,
    isSummaryView,
  });

  useEffect(() => {
    const standardParam = searchParams.get("standard");
    const questionParam = searchParams.get("question");
    if (standardParam && rows.some((r) => r.id === standardParam)) {
      setSelectedId(standardParam);
      const standard = rows.find((r) => r.id === standardParam);
      const qId =
        questionParam &&
        standard?.questions.some((q) => q.questionId === questionParam)
          ? questionParam
          : standard?.questions[0]?.questionId ?? null;
      setSelectedQuestionId(qId);
      setSheetOpen(true);
    }
  }, [searchParams, rows]);

  const columns: DataTableColumn<PresentedAssessmentStandard>[] = useMemo(
    () => [
      {
        id: "standard",
        header: uiLabel("standard", locale),
        accessor: (row) => (
          <div className="min-w-0">
            <p className="font-medium tabular-nums">{row.standardNumber}</p>
            <p className="truncate text-xs text-muted-foreground">
              {row.standardTitle}
            </p>
            <p className="truncate text-xs text-muted-foreground/80">
              {row.domainNumber} · {row.domainTitle}
            </p>
          </div>
        ),
        sortValue: (row) => row.standardNumber,
        filterValue: (row) =>
          `${row.standardNumber} ${row.standardTitle} ${row.domainTitle}`,
      },
      {
        id: "status",
        header: uiLabel("status", locale),
        accessor: (row) => (
          <StatusPill
            variant={readinessVariantFromLevel(uxStatusLevel(row.status))}
          >
            {locale === "ar" ? row.statusLabelAr : row.statusLabelEn}
          </StatusPill>
        ),
        sortValue: (row) => row.status,
        filterValue: (row) =>
          `${row.statusLabelEn} ${row.statusLabelAr} ${row.status}`,
      },
      {
        id: "items",
        header: uiLabel("assessmentItems", locale),
        accessor: (row) => (
          <span className="tabular-nums text-muted-foreground">
            {row.questions.filter((q) => q.answer !== null).length}/
            {row.questions.length}
          </span>
        ),
        sortValue: (row) =>
          row.questions.filter((q) => q.answer !== null).length,
        filterValue: (row) => String(row.questions.length),
      },
      {
        id: "pin",
        header: uiLabel("assessmentPinnedVersion", locale),
        accessor: (row) => (
          <span className="text-xs text-muted-foreground">
            {locale === "ar" ? row.pinLabelAr : row.pinLabelEn}
          </span>
        ),
        sortValue: (row) => row.pinLabelEn,
        filterValue: (row) => `${row.pinLabelEn} ${row.pinLabelAr}`,
      },
    ],
    [locale],
  );

  const handleSelect = useCallback((row: PresentedAssessmentStandard) => {
    setSelectedId(row.id);
    setSelectedQuestionId(row.questions[0]?.questionId ?? null);
    setSheetOpen(true);
  }, []);

  const handleResponseSubmitted = useCallback(
    (questionId: string, answer: string, note: string | null) => {
      setRows((prev) =>
        prev.map((standard) => ({
          ...standard,
          questions: standard.questions.map((q) =>
            q.questionId === questionId
              ? { ...q, answer, note, respondedAt: new Date().toISOString() }
              : q,
          ),
        })),
      );
    },
    [setRows],
  );

  const notStartedCount = rows.filter((s) =>
    s.questions.every((q) => q.status === "not_assessed"),
  ).length;

  const pendingActions =
    notStartedCount > 0 && !isSummaryView
      ? [
          {
            id: "assessment-items",
            count: notStartedCount,
            label: uiLabel("assessmentWhatsNextAction", locale),
            priority: "medium" as const,
          },
        ]
      : [];

  return (
    <div className="space-y-6">
      <ScreenAlertBanner
        variant="brand"
        title={uiLabel("assessmentContentPack", locale)}
      >
        <p>
          {locale === "ar"
            ? presentation.contentPackLabelAr
            : presentation.contentPackLabelEn}
        </p>
        <p className="mt-1 text-xs">
          {uiLabel("assessmentPinNote", locale)}
        </p>
      </ScreenAlertBanner>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>{uiLabel("assessmentTitle", locale)}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {uiLabel("assessmentSubtitle", locale)}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {uiLabel("assessmentProgress", locale)}:{" "}
                <span className="font-semibold text-foreground tabular-nums">
                  {presentation.startedCount}/{presentation.totalStandards}
                </span>
              </p>

              <DataTable
                columns={columns}
                data={rows}
                getRowId={(row) => row.id}
                getRowAriaLabel={(row) =>
                  `${row.standardNumber} — ${row.standardTitle}, ${locale === "ar" ? row.statusLabelAr : row.statusLabelEn}`
                }
                selectedId={selectedId}
                onSelectRow={handleSelect}
                searchable
                searchPlaceholder={uiLabel("assessmentSearch", locale)}
                caption={uiLabel("assessmentTitle", locale)}
                loading={loading}
                error={error}
                emptyTitle={uiLabel("assessmentEmptyTitle", locale)}
                emptyDescription={uiLabel(
                  "assessmentEmptyDescription",
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
            summaryHint={uiLabel("assessmentBoardHint", locale)}
          />
        </aside>
      </div>

      <QuestionDetailSheet
        assessmentId={presentation.assessmentId}
        standard={selected}
        selectedQuestionId={selectedQuestionId}
        onQuestionSelect={setSelectedQuestionId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        locale={locale}
        isSummaryView={isSummaryView}
        realWritesEnabled={realWritesEnabled}
        onResponseSubmitted={handleResponseSubmitted}
      />
    </div>
  );
}

export function AssessmentClient(props: AssessmentClientProps): ReactNode {
  return (
    <Suspense fallback={null}>
      <AssessmentClientInner {...props} />
    </Suspense>
  );
}
