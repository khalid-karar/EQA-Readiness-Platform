"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { ItemStatus } from "@eqa/workflows";
import {
  resolveAssignRemediation,
  resolveReadyForRetest,
  resolveRetestFail,
  resolveRetestPass,
} from "@eqa/workflows/remediation-pure";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill, readinessVariantFromLevel } from "@/components/ui/status-pill";
import { RemediationLifecycle } from "@/components/remediation/remediation-lifecycle";
import { overdueDaysLabel } from "@/lib/remediation-display";
import type {
  PresentedLinkedEvidence,
  PresentedRemediationRow,
} from "@/lib/present-remediation";
import { uploadEvidence } from "@/lib/evidence-api-client";
import { postUiAction } from "@/lib/ui-action-client";
import { uiLabel } from "@/lib/ui-labels";
import { uxStatusLevel } from "@/lib/status-level";
import { useToast } from "@/hooks/use-toast";

interface RemediationWorkspacePanelProps {
  row: PresentedRemediationRow | null;
  locale: "en" | "ar";
  isSummaryView: boolean;
  canOperate: boolean;
  realWritesEnabled: boolean;
  statusLabel: string;
  onRowUpdate: (remediationId: string, patch: Partial<PresentedRemediationRow>) => void;
  onStatusChange: (remediationId: string, status: ItemStatus) => void;
  onEvidenceAdded: (
    remediationId: string,
    evidence: PresentedLinkedEvidence,
  ) => void;
}

function isClosedStatus(status: ItemStatus): boolean {
  return status === "closed_ready" || status === "not_applicable";
}

export function RemediationWorkspacePanel({
  row,
  locale,
  isSummaryView,
  canOperate,
  realWritesEnabled,
  statusLabel,
  onRowUpdate,
  onStatusChange,
  onEvidenceAdded,
}: RemediationWorkspacePanelProps): ReactNode {
  const { toast } = useToast();
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [retestNote, setRetestNote] = useState("");
  const [ownerDraft, setOwnerDraft] = useState("");
  const [actionDraft, setActionDraft] = useState("");
  const [targetDateDraft, setTargetDateDraft] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!row) return;
    setOwnerDraft(row.owner);
    setActionDraft(row.action);
    setTargetDateDraft(row.targetDate);
    setRetestNote("");
    setActionError(null);
  }, [row]);

  const applyTransition = useCallback(
    (nextStatus: ItemStatus) => {
      if (!row) return;
      setActionError(null);
      onStatusChange(row.remediationId, nextStatus);
      toast({
        variant: "success",
        title: uiLabel("remediationActionSuccess", locale),
      });
    },
    [row, locale, onStatusChange, toast],
  );

  const runTransition = useCallback(
    async (action: "start" | "ready" | "pass" | "fail") => {
      if (!row) return;
      setActionError(null);
      setSubmitting(true);
      try {
        if (realWritesEnabled) {
          const result = await postUiAction<{ itemStatus: ItemStatus }>(
            "/api/actions/remediation",
            {
              remediationId: row.remediationId,
              transition: action,
              ...(action === "fail" && retestNote ? { retestNote } : {}),
            },
          );
          applyTransition(result.itemStatus);
        } else {
          let transition;
          switch (action) {
            case "start":
              transition = resolveAssignRemediation(row.itemStatus);
              break;
            case "ready":
              transition = resolveReadyForRetest(row.itemStatus);
              break;
            case "pass":
              transition = resolveRetestPass(row.itemStatus);
              break;
            case "fail":
              transition = resolveRetestFail(row.itemStatus);
              break;
          }
          applyTransition(transition.to);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : uiLabel("remediationActionError", locale);
        setActionError(message);
        toast({
          variant: "destructive",
          title: uiLabel("remediationActionError", locale),
          description: message,
        });
      } finally {
        setSubmitting(false);
      }
    },
    [row, locale, applyTransition, realWritesEnabled, retestNote, toast],
  );

  const savePlan = useCallback(async () => {
    if (!row) return;
    setActionError(null);
    setSubmitting(true);
    try {
      if (realWritesEnabled) {
        const result = await postUiAction<{
          owner: string;
          action: string;
          targetDate: string;
        }>("/api/actions/update-remediation-plan", {
          remediationId: row.remediationId,
          owner: ownerDraft.trim(),
          action: actionDraft.trim(),
          targetDate: targetDateDraft.trim(),
        });
        onRowUpdate(row.remediationId, {
          owner: result.owner,
          action: result.action,
          targetDate: result.targetDate,
        });
      } else {
        onRowUpdate(row.remediationId, {
          owner: ownerDraft.trim(),
          action: actionDraft.trim(),
          targetDate: targetDateDraft.trim(),
        });
      }
      toast({
        variant: "success",
        title: uiLabel("remediationPlanUpdated", locale),
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : uiLabel("remediationActionError", locale);
      setActionError(message);
      toast({
        variant: "destructive",
        title: uiLabel("remediationActionError", locale),
        description: message,
      });
    } finally {
      setSubmitting(false);
    }
  }, [
    row,
    ownerDraft,
    actionDraft,
    targetDateDraft,
    realWritesEnabled,
    locale,
    onRowUpdate,
    toast,
  ]);

  const handleEvidenceUpload = useCallback(
    async (file: File) => {
      if (!row) return;
      setUploading(true);
      setActionError(null);
      try {
        const formData = new FormData();
        formData.set("file", file);
        formData.set("standardNumber", row.standardNumber);
        formData.set("questionId", row.questionId);
        const result = await uploadEvidence(formData);
        onEvidenceAdded(row.remediationId, {
          evidenceId: result.evidenceId,
          version: result.version,
          fileName: file.name,
          scanStatus: result.scanStatus,
          scanLabel:
            result.scanStatus === "clean"
              ? locale === "ar"
                ? "نظيف"
                : "Clean"
              : result.scanStatus,
          uploadedAt: new Date().toISOString(),
        });
        toast({
          variant: "success",
          title: uiLabel("remediationUploadEvidence", locale),
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : uiLabel("remediationActionError", locale);
        setActionError(message);
      } finally {
        setUploading(false);
      }
    },
    [row, locale, onEvidenceAdded, toast],
  );

  if (!row) {
    return (
      <Card className="h-full min-h-[24rem]">
        <CardContent className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
          {uiLabel("remediationWorkspaceEmpty", locale)}
        </CardContent>
      </Card>
    );
  }

  const closed = isClosedStatus(row.itemStatus);
  const scheduleLabel =
    locale === "ar" ? row.scheduleLabelAr : row.scheduleLabelEn;
  const scheduleVariant =
    closed ? "conformant" : row.isOverdue ? "gap" : "partial";
  const canEditPlan = canOperate && row.itemStatus === "remediation_in_progress";

  return (
    <Card className="h-full">
      <CardHeader className="space-y-2">
        <CardTitle className="text-base">
          {uiLabel("remediationWorkspaceTitle", locale)}
        </CardTitle>
        <p className="text-sm font-medium">
          {row.standardNumber} — {row.standardTitle}
        </p>
        <p className="text-xs text-muted-foreground">
          {uiLabel("remediationDetailSubtitle", locale)} · {row.questionId}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill variant={readinessVariantFromLevel(uxStatusLevel(row.itemStatus))}>
            {statusLabel}
          </StatusPill>
          <StatusPill variant={scheduleVariant} size="sm">
            {scheduleLabel}
          </StatusPill>
        </div>

        <RemediationLifecycle
          status={row.itemStatus}
          locale={locale}
          hadRetestFailure={row.hadRetestFailure}
        />

        {isSummaryView ? (
          <p className="text-xs text-muted-foreground">
            {uiLabel("boardRemediationDetailHint", locale)}
          </p>
        ) : (
          <>
            {canEditPlan ? (
              <section className="space-y-3 rounded-md border bg-muted/20 p-4">
                <h3 className="text-sm font-semibold">
                  {uiLabel("remediationReassignOwner", locale)}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="text-xs font-medium uppercase text-muted-foreground">
                      {uiLabel("owner", locale)}
                    </span>
                    <input
                      value={ownerDraft}
                      onChange={(e) => setOwnerDraft(e.target.value)}
                      className="w-full rounded-md border border-input bg-surface px-3 py-2"
                      disabled={submitting}
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-xs font-medium uppercase text-muted-foreground">
                      {uiLabel("remediationDue", locale)}
                    </span>
                    <input
                      type="date"
                      value={targetDateDraft}
                      onChange={(e) => setTargetDateDraft(e.target.value)}
                      className="w-full rounded-md border border-input bg-surface px-3 py-2"
                      disabled={submitting}
                    />
                  </label>
                </div>
                <label className="block space-y-1 text-sm">
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    {uiLabel("action", locale)}
                  </span>
                  <textarea
                    value={actionDraft}
                    onChange={(e) => setActionDraft(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-input bg-surface px-3 py-2"
                    disabled={submitting}
                  />
                </label>
                <Button
                  type="button"
                  size="sm"
                  disabled={submitting}
                  onClick={() => void savePlan()}
                >
                  {uiLabel("remediationSavePlan", locale)}
                </Button>
              </section>
            ) : (
              <>
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">
                    {uiLabel("action", locale)}
                  </h3>
                  <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm leading-relaxed">
                    {row.action}
                  </p>
                </section>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      {uiLabel("owner", locale)}
                    </p>
                    <p className="font-medium">{row.owner}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      {uiLabel("remediationDue", locale)}
                    </p>
                    <p className="font-medium tabular-nums">{row.targetDate}</p>
                  </div>
                </div>
              </>
            )}

            {row.isOverdue && !closed ? (
              <div
                className="flex items-center gap-2 rounded-md border border-readiness-gap/30 bg-readiness-gap-bg p-3 text-sm text-readiness-gap"
                role="alert"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                <span>
                  {uiLabel("remediationOverdueAlert", locale)}{" "}
                  <span className="font-medium tabular-nums">
                    ({overdueDaysLabel(locale, row.daysOverdue)})
                  </span>
                </span>
              </div>
            ) : null}

            {row.retestNote ? (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">
                  {uiLabel("remediationRetestNoteTitle", locale)}
                </h3>
                <p className="rounded-md border border-readiness-partial/30 bg-readiness-partial-bg px-3 py-2 text-sm">
                  {row.retestNote}
                </p>
              </section>
            ) : null}

            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">
                  {uiLabel("remediationClosureEvidenceTitle", locale)}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {uiLabel("remediationClosureEvidenceHint", locale)}
                </p>
              </div>
              {row.linkedEvidence.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {uiLabel("remediationNoLinkedEvidence", locale)}
                </p>
              ) : (
                <ul className="space-y-2">
                  {row.linkedEvidence.map((item) => (
                    <li
                      key={`${item.evidenceId}-${item.version}`}
                      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <span className="truncate">{item.fileName}</span>
                      <StatusPill
                        variant={
                          item.scanStatus === "clean" ? "conformant" : "partial"
                        }
                        size="sm"
                      >
                        {item.scanLabel}
                      </StatusPill>
                    </li>
                  ))}
                </ul>
              )}
              {canOperate && !closed && realWritesEnabled ? (
                <div>
                  <input
                    id={`remediation-evidence-${row.remediationId}`}
                    type="file"
                    className="sr-only"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleEvidenceUpload(file);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={uploading}
                    onClick={() =>
                      document
                        .getElementById(`remediation-evidence-${row.remediationId}`)
                        ?.click()
                    }
                  >
                    {uiLabel("remediationUploadEvidence", locale)}
                  </Button>
                </div>
              ) : null}
            </section>

            {closed ? (
              <div className="flex items-center gap-2 text-sm text-readiness-conformant">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                <span>{uiLabel("remediationClosedHint", locale)}</span>
              </div>
            ) : null}

            {row.itemStatus === "under_human_review" ? (
              <p className="text-xs text-muted-foreground">
                {uiLabel("remediationHumanReviewHint", locale)}
              </p>
            ) : null}
          </>
        )}

        {actionError ? (
          <p className="text-sm text-readiness-gap" role="alert">
            {actionError}
          </p>
        ) : null}

        {canOperate && !closed ? (
          <div className="space-y-3 border-t pt-4">
            {row.itemStatus === "ready_for_retest" ? (
              <textarea
                value={retestNote}
                onChange={(e) => setRetestNote(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm"
                placeholder={uiLabel("remediationRetestNoteTitle", locale)}
                aria-label={uiLabel("remediationRetestNoteTitle", locale)}
              />
            ) : null}
            <div className="flex flex-wrap gap-2">
              {row.itemStatus === "gap_confirmed" ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={submitting}
                  onClick={() => void runTransition("start")}
                >
                  {uiLabel("remediationStart", locale)}
                </Button>
              ) : null}
              {row.itemStatus === "remediation_in_progress" ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={submitting}
                  onClick={() => void runTransition("ready")}
                >
                  {uiLabel("remediationMarkReady", locale)}
                </Button>
              ) : null}
              {row.itemStatus === "ready_for_retest" ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    disabled={submitting}
                    onClick={() => void runTransition("pass")}
                  >
                    {uiLabel("remediationRetestPass", locale)}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={submitting}
                    onClick={() => void runTransition("fail")}
                  >
                    {uiLabel("remediationRetestFail", locale)}
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
