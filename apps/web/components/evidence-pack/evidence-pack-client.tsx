"use client";

import { Suspense, useCallback, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import type { EvidencePackPresentation } from "@/lib/present-evidence-pack";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PackDisclaimerBanner } from "@/components/evidence-pack/pack-disclaimer";
import { WhatsNextPanel } from "@/components/orientation/whats-next-panel";
import { useDemoTableState } from "@/components/shell/use-demo-table-state";
import { useSyncShellMeta } from "@/components/shell/use-sync-shell-meta";
import { DEFAULT_TENANT_NAME } from "@/lib/nav-config";
import { generateEvidencePack } from "@/lib/report-api-client";
import { uiLabel } from "@/lib/ui-labels";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";

interface EvidencePackClientProps {
  presentation: EvidencePackPresentation;
  realWritesEnabled: boolean;
}

type PreviewRow = EvidencePackPresentation["previewRows"][number];

function EvidencePackClientInner({
  presentation,
  realWritesEnabled,
}: EvidencePackClientProps): ReactNode {
  const router = useRouter();
  const { toast } = useToast();
  const { locale, isSummaryView, canGenerate } = presentation;
  const [generating, setGenerating] = useState(false);
  const [downloadPath, setDownloadPath] = useState(presentation.downloadPath);
  const [hasGeneratedExport, setHasGeneratedExport] = useState(
    presentation.hasGeneratedExport,
  );

  const { rows, loading, error } = useDemoTableState(
    presentation.previewRows,
    uiLabel("packErrorDemo", locale),
  );

  useSyncShellMeta({
    locale: presentation.locale,
    tenantName: DEFAULT_TENANT_NAME,
    assessmentName: presentation.assessmentName,
    location: uiLabel("packLocation", locale),
    roleLabel: presentation.roleLabel,
    isSummaryView,
  });

  const handleGenerate = useCallback(async () => {
    if (!realWritesEnabled || !canGenerate) return;
    setGenerating(true);
    try {
      await generateEvidencePack({
        assessmentId: presentation.assessmentId,
        contentPackId: presentation.contentPackId,
        contentVersion: presentation.contentPackVersion,
        locale,
      });
      const generatedPath = `/api/evidence-pack/download?assessmentId=${encodeURIComponent(presentation.assessmentId)}`;
      setDownloadPath(generatedPath);
      setHasGeneratedExport(true);
      toast({
        variant: "success",
        title: uiLabel("packGenerateSuccess", locale),
      });
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : uiLabel("packErrorDemo", locale);
      toast({
        variant: "destructive",
        title: uiLabel("packErrorDemo", locale),
        description: message,
      });
    } finally {
      setGenerating(false);
    }
  }, [
    canGenerate,
    locale,
    presentation.assessmentId,
    presentation.contentPackId,
    presentation.contentPackVersion,
    realWritesEnabled,
    router,
    toast,
  ]);

  const pendingActions =
    canGenerate && !hasGeneratedExport
      ? [
          {
            id: "generate-pack",
            count: 1,
            label: uiLabel("packGenerateAction", locale),
            priority: "high" as const,
          },
        ]
      : [];

  const columns: DataTableColumn<PreviewRow>[] = useMemo(
    () => [
      {
        id: "standard",
        header: uiLabel("standard", locale),
        accessor: (row) => (
          <span className="font-medium tabular-nums">{row.standardNumber}</span>
        ),
        sortValue: (row) => row.standardNumber,
        filterValue: (row) => row.standardNumber,
      },
      {
        id: "titleEn",
        header: uiLabel("packTitleEn", locale),
        accessor: (row) => (
          <span className="text-sm" lang="en">{row.standardTitleEn}</span>
        ),
        sortValue: (row) => row.standardTitleEn,
        filterValue: (row) => row.standardTitleEn,
      },
      {
        id: "titleAr",
        header: uiLabel("packTitleAr", locale),
        accessor: (row) => (
          <span className="text-sm" lang="ar" dir="rtl">
            {row.standardTitleAr}
          </span>
        ),
        sortValue: (row) => row.standardTitleAr,
        filterValue: (row) => row.standardTitleAr,
      },
      {
        id: "refs",
        header: uiLabel("packEvidenceRefs", locale),
        accessor: (row) => (
          <span className="tabular-nums">{row.evidenceRefCount}</span>
        ),
        sortValue: (row) => row.evidenceRefCount,
        filterValue: (row) => String(row.evidenceRefCount),
      },
      {
        id: "gaps",
        header: uiLabel("packGapSummary", locale),
        accessor: (row) => (
          <div className="max-w-xs space-y-1 text-xs text-muted-foreground">
            <p lang="en">{row.gapSummaryEn}</p>
            <p lang="ar" dir="rtl">{row.gapSummaryAr}</p>
          </div>
        ),
        filterValue: (row) =>
          `${row.gapSummaryEn} ${row.gapSummaryAr}`,
      },
    ],
    [locale],
  );

  const downloadHref =
    realWritesEnabled && hasGeneratedExport
      ? downloadPath
      : presentation.sampleDownloadPath;

  return (
    <div className="space-y-6">
      <PackDisclaimerBanner presentation={presentation} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>{uiLabel("packBilingualTitle", locale)}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {uiLabel("packSubtitle", locale)}
              </p>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border bg-muted/20 px-3 py-2">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  {uiLabel("packTitleEn", locale)}
                </p>
                <p className="text-sm font-medium" lang="en">
                  {presentation.assessmentNameEn}
                </p>
              </div>
              <div className="rounded-md border bg-muted/20 px-3 py-2">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  {uiLabel("packTitleAr", locale)}
                </p>
                <p className="text-sm font-medium" lang="ar" dir="rtl">
                  {presentation.assessmentNameAr}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>{uiLabel("packSummaryTitle", locale)}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <StatusPill variant="neutral">
                {uiLabel("packStandards", locale)}:{" "}
                <span className="tabular-nums">{presentation.standardCount}</span>
              </StatusPill>
              <StatusPill variant="neutral">
                {uiLabel("packEvidenceRefs", locale)}:{" "}
                <span className="tabular-nums">
                  {presentation.evidenceReferenceCount}
                </span>
              </StatusPill>
              <StatusPill variant="partial">
                {uiLabel("packReadiness", locale)}:{" "}
                <span className="tabular-nums">{presentation.readinessScore}%</span> —{" "}
                {presentation.readinessLabel}
              </StatusPill>
              <StatusPill variant="conformant">
                {uiLabel("packRawBundled", locale)}:{" "}
                <span className="tabular-nums">{presentation.bundledFileCount}</span>
              </StatusPill>
              <p className="text-xs text-muted-foreground w-full pt-1">
                {uiLabel("readinessLensNote", locale)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>{uiLabel("packPreviewTitle", locale)}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {uiLabel("packNoRawHint", locale)}
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={rows}
                getRowId={(row) => row.id}
                getRowAriaLabel={(row) =>
                  `${row.standardNumber}, ${row.evidenceRefCount} ${uiLabel("packEvidenceRefs", locale)}`
                }
                searchable
                searchPlaceholder={uiLabel("packPreviewSearch", locale)}
                caption={uiLabel("packPreviewTitle", locale)}
                loading={loading}
                error={error}
                emptyTitle={uiLabel("packEmptyTitle", locale)}
                emptyDescription={uiLabel("packEmptyDescription", locale)}
              />
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="border-brand-gold/40 bg-brand-gold/5 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Download className="h-4 w-4" aria-hidden />
                {uiLabel("packDownloadTitle", locale)}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {uiLabel("packDownloadCta", locale)}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {uiLabel("packDownloadHint", locale)}
              </p>
              <Button size="default" className="w-full" asChild>
                <Link
                  href={downloadHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {uiLabel("packDownloadButton", locale)}
                </Link>
              </Button>
              {realWritesEnabled && !hasGeneratedExport ? (
                <p className="text-xs text-muted-foreground">
                  {uiLabel("demoDisabledHint", locale)}
                </p>
              ) : null}
            </CardContent>
          </Card>

          {canGenerate ? (
            <Card>
              <CardContent className="space-y-3 pt-6">
                <p className="text-sm text-muted-foreground">
                  {uiLabel("packGenerateHint", locale)}
                </p>
                <Button
                  size="sm"
                  disabled={!realWritesEnabled || generating}
                  onClick={() => void handleGenerate()}
                  title={
                    !realWritesEnabled
                      ? uiLabel("demoDisabledHint", locale)
                      : undefined
                  }
                >
                  {uiLabel("packGenerateButton", locale)}
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <WhatsNextPanel
            locale={locale}
            isSummaryView={isSummaryView}
            pendingActions={pendingActions}
            summaryHint={uiLabel("packBoardHint", locale)}
          />
        </aside>
      </div>
    </div>
  );
}

export function EvidencePackClient(props: EvidencePackClientProps): ReactNode {
  return (
    <Suspense fallback={null}>
      <EvidencePackClientInner {...props} />
    </Suspense>
  );
}
