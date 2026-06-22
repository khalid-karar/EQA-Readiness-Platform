"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import type { ReviewAction } from "@eqa/workflows/types";
import { resolveHumanReview } from "@eqa/workflows/human-review";
import type { ItemStatus } from "@eqa/workflows/state-machine";
import { uxStatusLabel } from "@eqa/workflows/ux-status";
import { Button } from "@/components/ui/button";
import { uploadEvidence } from "@/lib/evidence-api-client";
import { mapUploadedEvidenceItem } from "@/lib/map-uploaded-evidence";
import { postUiAction } from "@/lib/ui-action-client";
import type {
  PresentedStandardEvidence,
  PresentedStandardRequirement,
} from "@/lib/standard-detail-shared";
import { uiLabel } from "@/lib/ui-labels";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface StandardRequirementActionsProps {
  assessmentId: string;
  standardNumber: string;
  requirement: PresentedStandardRequirement;
  locale: "en" | "ar";
  canOperate: boolean;
  canReview: boolean;
  realWritesEnabled: boolean;
  onRequirementChange: (updated: PresentedStandardRequirement) => void;
}

export function StandardRequirementActions({
  assessmentId,
  standardNumber,
  requirement,
  locale,
  canOperate,
  canReview,
  realWritesEnabled,
  onRequirementChange,
}: StandardRequirementActionsProps): ReactNode {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [editText, setEditText] = useState(requirement.draftSummary ?? "");
  const [isEditing, setIsEditing] = useState(false);
  const [remediationAction, setRemediationAction] = useState("");
  const [remediationOwner, setRemediationOwner] = useState("");
  const [remediationDue, setRemediationDue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const canRate =
    canOperate && requirement.rubric.length > 0 && (realWritesEnabled || !requirement.answer);
  const canUpload = canOperate && realWritesEnabled;
  const hasCleanEvidence = requirement.evidence.some((e) => e.scanStatus === "clean");
  const canRunGapFlag =
    canOperate &&
    !requirement.draftSummary &&
    !requirement.finalConclusion &&
    hasCleanEvidence &&
    ["not_assessed", "evidence_requested", "evidence_submitted"].includes(
      requirement.status,
    );
  const canReviewDraft =
    canReview &&
    requirement.draftSummary &&
    !requirement.finalConclusion &&
    requirement.status === "ai_flagged" &&
    requirement.findingId;
  const canAssignRemediation =
    canOperate &&
    requirement.status === "gap_confirmed" &&
    !requirement.remediationId;

  const patchRequirement = useCallback(
    (patch: Partial<PresentedStandardRequirement>) => {
      onRequirementChange({ ...requirement, ...patch });
    },
    [onRequirementChange, requirement],
  );

  const handleSubmitRating = useCallback(async () => {
    if (!selectedLevel) return;
    setActionError(null);
    setSubmitting(true);
    try {
      if (realWritesEnabled) {
        await postUiAction("/api/actions/submit-response", {
          assessmentId,
          questionId: requirement.questionId,
          answer: selectedLevel,
          ...(note ? { note } : {}),
          pin: {
            contentPackId: requirement.pinPackId,
            version: requirement.pinVersion,
            contentHash: requirement.pinHash,
          },
        });
      }
      patchRequirement({
        answer: selectedLevel,
        note: note || null,
      });
      toast({ variant: "success", title: uiLabel("assessmentSubmitSuccess", locale) });
      setNote("");
      setSelectedLevel(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : uiLabel("assessmentErrorDemo", locale);
      setActionError(message);
    } finally {
      setSubmitting(false);
    }
  }, [
    assessmentId,
    locale,
    note,
    patchRequirement,
    realWritesEnabled,
    requirement,
    selectedLevel,
    toast,
  ]);

  const handleUpload = useCallback(async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !canUpload) return;
    setActionError(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("standardNumber", standardNumber);
      formData.set("questionId", requirement.questionId);
      const result = await uploadEvidence(formData);
      const item = mapUploadedEvidenceItem({
        evidenceId: result.evidenceId,
        version: result.version,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        scanStatus: result.scanStatus,
        links: [standardNumber, requirement.questionId],
        uploadedAt: new Date().toISOString(),
      });
      const evidence: PresentedStandardEvidence = {
        evidenceId: item.evidenceId,
        fileName: item.fileName,
        scanStatus:
          item.scanStatus === "clean"
            ? "clean"
            : item.scanStatus === "infected"
              ? "infected"
              : "quarantined",
        scanLabelEn: item.scanLabelEn,
        scanLabelAr: item.scanLabelAr,
        sizeLabelEn: item.sizeLabelEn,
        sizeLabelAr: item.sizeLabelAr,
      };
      patchRequirement({
        evidence: [...requirement.evidence, evidence],
      });
      if (result.scanStatus === "infected") {
        toast({ variant: "destructive", title: uiLabel("evidenceUploadInfected", locale) });
      } else {
        toast({ variant: "success", title: uiLabel("evidenceUploadSuccess", locale) });
      }
      if (fileRef.current) fileRef.current.value = "";
    } catch (error) {
      const message =
        error instanceof Error ? error.message : uiLabel("evidenceErrorDemo", locale);
      setActionError(message);
    } finally {
      setSubmitting(false);
    }
  }, [canUpload, locale, patchRequirement, requirement, standardNumber, toast]);

  const handleGapFlag = useCallback(async () => {
    setActionError(null);
    setSubmitting(true);
    try {
      if (realWritesEnabled) {
        const result = await postUiAction<{
          findingId: string | null;
          draftSummary: string | null;
          itemStatus: ItemStatus;
        }>("/api/actions/run-gap-flag", {
          questionId: requirement.questionId,
          standardNumber,
          locale,
        });
        patchRequirement({
          findingId: result.findingId,
          draftSummary: result.draftSummary,
          status: result.itemStatus,
          statusLabel: uxStatusLabel(result.itemStatus, locale),
        });
      } else {
        patchRequirement({
          findingId: `demo-finding-${requirement.questionId}`,
          draftSummary:
            requirement.draftSummary ??
            "DRAFT (demo): possible gap flagged pending human review.",
          status: "ai_flagged",
        });
      }
      toast({ variant: "warning", title: uiLabel("standardDetailGapFlagSuccess", locale) });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : uiLabel("standardDetailGapFlagError", locale);
      setActionError(message);
    } finally {
      setSubmitting(false);
    }
  }, [locale, patchRequirement, realWritesEnabled, requirement, standardNumber, toast]);

  const handleReview = useCallback(
    async (action: ReviewAction) => {
      if (!requirement.findingId) return;
      setActionError(null);
      setSubmitting(true);
      try {
        let status: ItemStatus;
        let conclusion: string | null = null;
        if (realWritesEnabled) {
          const result = await postUiAction<{
            finalConclusion: string | null;
            itemStatus: ItemStatus;
          }>("/api/actions/human-review", {
            findingId: requirement.findingId,
            action,
            ...(action === "edit_accept" ? { editedConclusion: editText } : {}),
          });
          status = result.itemStatus;
          conclusion = result.finalConclusion;
        } else if (requirement.draftSummary) {
          const draft = {
            kind: "draft_finding" as const,
            status: "draft" as const,
            findingId: requirement.findingId,
            assessmentId,
            questionId: requirement.questionId,
            standardNumber,
            draftSummary: requirement.draftSummary,
            provenance: {
              promptVersion: "gap-flag@1.0.0",
              rubricVersion: requirement.pinVersion,
              modelAdapter: "local-stub",
              adapterLocation: "local" as const,
              inputSummary: "demo",
              output: requirement.draftSummary,
              timestamp: new Date().toISOString(),
            },
            contentPin: {
              assessmentId,
              contentPackId: requirement.pinPackId,
              version: requirement.pinVersion,
              contentHash: requirement.pinHash,
            },
            requiresHumanReview: true as const,
          };
          const outcome = resolveHumanReview(
            draft,
            action,
            action === "edit_accept" ? editText : undefined,
          );
          status = outcome.statusPath[1];
          conclusion = outcome.finalConclusion?.conclusion ?? null;
        } else {
          return;
        }
        patchRequirement({
          status,
          statusLabel: uxStatusLabel(status, locale),
          finalConclusion: conclusion,
        });
        toast({ variant: "success", title: uiLabel("findingActionSuccess", locale) });
        setIsEditing(false);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : uiLabel("findingActionError", locale);
        setActionError(message);
      } finally {
        setSubmitting(false);
      }
    },
    [
      assessmentId,
      editText,
      locale,
      patchRequirement,
      realWritesEnabled,
      requirement,
      standardNumber,
      toast,
    ],
  );

  const handleAssignRemediation = useCallback(async () => {
    if (!remediationAction.trim() || !remediationOwner.trim() || !remediationDue) return;
    setActionError(null);
    setSubmitting(true);
    try {
      if (realWritesEnabled) {
        const result = await postUiAction<{
          remediationId: string;
          itemStatus: ItemStatus;
        }>("/api/actions/assign-remediation", {
          assessmentId,
          questionId: requirement.questionId,
          standardNumber,
          action: remediationAction.trim(),
          owner: remediationOwner.trim(),
          targetDate: remediationDue,
        });
        patchRequirement({
          remediationId: result.remediationId,
          remediationAction: remediationAction.trim(),
          remediationOwner: remediationOwner.trim(),
          remediationTargetDate: remediationDue,
          status: result.itemStatus,
          statusLabel: uxStatusLabel(result.itemStatus, locale),
        });
      } else {
        patchRequirement({
          remediationId: `demo-rem-${requirement.questionId}`,
          remediationAction: remediationAction.trim(),
          remediationOwner: remediationOwner.trim(),
          remediationTargetDate: remediationDue,
          status: "remediation_in_progress",
          statusLabel: uxStatusLabel("remediation_in_progress", locale),
        });
      }
      toast({ variant: "success", title: uiLabel("standardDetailRemediationSuccess", locale) });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : uiLabel("standardDetailRemediationError", locale);
      setActionError(message);
    } finally {
      setSubmitting(false);
    }
  }, [
    assessmentId,
    locale,
    patchRequirement,
    realWritesEnabled,
    remediationAction,
    remediationDue,
    remediationOwner,
    requirement,
    standardNumber,
    toast,
  ]);

  if (!canOperate && !canReview) return null;

  return (
    <div className="space-y-4 border-t pt-4">
      {canRate ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {uiLabel("assessmentRubricTitle", locale)}
          </p>
          <ul className="space-y-2">
            {requirement.rubric.map((level) => (
              <li key={level.level}>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setSelectedLevel(String(level.level))}
                  className={cn(
                    "w-full rounded-md border px-3 py-2 text-sm text-start transition-colors",
                    selectedLevel === String(level.level) &&
                      "border-brand-gold/50 bg-brand-gold/5",
                    requirement.answer === String(level.level) &&
                      "border-brand-gold/30",
                    "hover:bg-muted/50",
                  )}
                >
                  <p className="font-medium tabular-nums">
                    {level.level} — {level.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{level.descriptor}</p>
                </button>
              </li>
            ))}
          </ul>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm"
            placeholder={uiLabel("assessmentNoteLabel", locale)}
          />
          <Button
            type="button"
            size="sm"
            disabled={!selectedLevel || submitting}
            onClick={() => void handleSubmitRating()}
          >
            {uiLabel("assessmentSubmit", locale)}
          </Button>
        </div>
      ) : null}

      {canUpload ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {uiLabel("evidenceUpload", locale)}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            className="w-full text-sm"
            disabled={submitting}
          />
          <Button
            type="button"
            size="sm"
            disabled={submitting}
            onClick={() => void handleUpload()}
          >
            {uiLabel("evidenceUpload", locale)}
          </Button>
          <p className="text-xs text-muted-foreground">
            {uiLabel("evidenceQuarantineGate", locale)}
          </p>
        </div>
      ) : null}

      {canRunGapFlag ? (
        <div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={submitting}
            onClick={() => void handleGapFlag()}
          >
            {uiLabel("standardDetailRunGapFlag", locale)}
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">
            {uiLabel("standardDetailGapFlagHint", locale)}
          </p>
        </div>
      ) : null}

      {canReviewDraft ? (
        <div className="space-y-2">
          {isEditing ? (
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm"
            />
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={submitting}
              onClick={() => void handleReview("accept")}
            >
              {uiLabel("findingAccept", locale)}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={submitting}
              onClick={() => {
                if (isEditing) void handleReview("edit_accept");
                else setIsEditing(true);
              }}
            >
              {isEditing
                ? uiLabel("findingEditAccept", locale)
                : uiLabel("findingEdit", locale)}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={submitting}
              onClick={() => void handleReview("reject")}
            >
              {uiLabel("findingReject", locale)}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {uiLabel("standardDetailDismissHint", locale)}
          </p>
        </div>
      ) : null}

      {canAssignRemediation ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {uiLabel("standardDetailAssignRemediation", locale)}
          </p>
          <input
            type="text"
            value={remediationAction}
            onChange={(e) => setRemediationAction(e.target.value)}
            className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm"
            placeholder={uiLabel("action", locale)}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={remediationOwner}
              onChange={(e) => setRemediationOwner(e.target.value)}
              className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm"
              placeholder={uiLabel("owner", locale)}
            />
            <input
              type="date"
              value={remediationDue}
              onChange={(e) => setRemediationDue(e.target.value)}
              className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm"
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={submitting}
            onClick={() => void handleAssignRemediation()}
          >
            {uiLabel("standardDetailAssignRemediation", locale)}
          </Button>
        </div>
      ) : null}

      {requirement.remediationId ? (
        <p className="text-xs text-muted-foreground">
          {uiLabel("standardDetailRemediationLinked", locale)}: {requirement.remediationOwner}{" "}
          · {requirement.remediationTargetDate}
        </p>
      ) : null}

      {actionError ? (
        <p className="text-sm text-readiness-gap" role="alert">
          {actionError}
        </p>
      ) : null}

      {!realWritesEnabled && canOperate ? (
        <p className="text-xs text-muted-foreground">{uiLabel("demoDisabledHint", locale)}</p>
      ) : null}
    </div>
  );
}
