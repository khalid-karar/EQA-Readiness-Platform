"use client";

import { useCallback, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, Download, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  generateEvidencePack,
  runMockEqaSimulation,
} from "@/lib/report-api-client";
import { uiLabel } from "@/lib/ui-labels";
import { useToast } from "@/hooks/use-toast";

interface AdminActionsPanelProps {
  locale: "en" | "ar";
  realWritesEnabled: boolean;
  canRun: boolean;
  assessmentId: string;
  contentPackId: string;
  contentPackVersion: string;
  hasGeneratedEvidencePack: boolean;
  evidencePackDownloadPath: string;
}

export function AdminActionsPanel({
  locale,
  realWritesEnabled,
  canRun,
  assessmentId,
  contentPackId,
  contentPackVersion,
  hasGeneratedEvidencePack: initialHasExport,
  evidencePackDownloadPath,
}: AdminActionsPanelProps): ReactNode {
  const router = useRouter();
  const { toast } = useToast();
  const [runningMockEqa, setRunningMockEqa] = useState(false);
  const [generatingPack, setGeneratingPack] = useState(false);
  const [hasGeneratedExport, setHasGeneratedExport] = useState(initialHasExport);
  const [downloadPath, setDownloadPath] = useState(evidencePackDownloadPath);

  const canExecute = realWritesEnabled && canRun;

  const handleRunMockEqa = useCallback(async () => {
    if (!canExecute) return;
    setRunningMockEqa(true);
    try {
      await runMockEqaSimulation({
        assessmentId,
        contentPackId,
        contentVersion: contentPackVersion,
        locale,
      });
      toast({
        variant: "success",
        title: uiLabel("adminMockEqaSuccess", locale),
      });
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : uiLabel("adminMockEqaError", locale);
      toast({
        variant: "destructive",
        title: uiLabel("adminMockEqaError", locale),
        description: message,
      });
    } finally {
      setRunningMockEqa(false);
    }
  }, [
    assessmentId,
    canExecute,
    contentPackId,
    contentPackVersion,
    locale,
    router,
    toast,
  ]);

  const handleGeneratePack = useCallback(async () => {
    if (!canExecute) return;
    setGeneratingPack(true);
    try {
      await generateEvidencePack({
        assessmentId,
        contentPackId,
        contentVersion: contentPackVersion,
        locale,
      });
      setHasGeneratedExport(true);
      setDownloadPath(
        `/api/evidence-pack/download?assessmentId=${encodeURIComponent(assessmentId)}`,
      );
      toast({
        variant: "success",
        title: uiLabel("adminPackSuccess", locale),
      });
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : uiLabel("adminPackError", locale);
      toast({
        variant: "destructive",
        title: uiLabel("adminPackError", locale),
        description: message,
      });
    } finally {
      setGeneratingPack(false);
    }
  }, [
    assessmentId,
    canExecute,
    contentPackId,
    contentPackVersion,
    locale,
    router,
    toast,
  ]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{uiLabel("adminActionsTitle", locale)}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {uiLabel("adminActionsSubtitle", locale)}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Button
            size="sm"
            className="w-full justify-start gap-2"
            disabled={!canExecute || runningMockEqa}
            onClick={() => void handleRunMockEqa()}
          >
            <BarChart3 className="h-4 w-4 shrink-0" aria-hidden />
            {uiLabel("adminRunMockEqa", locale)}
          </Button>
          <p className="text-xs text-muted-foreground">
            {uiLabel("adminRunMockEqaHint", locale)}{" "}
            <Link
              href={`/mock-eqa?locale=${locale}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {uiLabel("adminViewMockEqa", locale)}
            </Link>
          </p>
        </div>

        <div className="space-y-2">
          <Button
            size="sm"
            variant="secondary"
            className="w-full justify-start gap-2"
            disabled={!canExecute || generatingPack}
            onClick={() => void handleGeneratePack()}
          >
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
            {uiLabel("adminGeneratePack", locale)}
          </Button>
          {hasGeneratedExport ? (
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start gap-2"
              asChild
            >
              <a href={downloadPath}>
                <Download className="h-4 w-4 shrink-0" aria-hidden />
                {uiLabel("adminDownloadPack", locale)}
              </a>
            </Button>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {uiLabel("adminGeneratePackHint", locale)}{" "}
            <Link
              href={`/evidence-pack?locale=${locale}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {uiLabel("adminViewPack", locale)}
            </Link>
          </p>
        </div>

        {!canRun ? (
          <p className="text-xs text-muted-foreground">
            {uiLabel("adminBoardHint", locale)}
          </p>
        ) : !realWritesEnabled ? (
          <p className="text-xs text-muted-foreground">
            {uiLabel("demoDisabledHint", locale)}
          </p>
        ) : null}

        <p className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {uiLabel("adminOpenQuestionNote", locale)}
        </p>
      </CardContent>
    </Card>
  );
}
