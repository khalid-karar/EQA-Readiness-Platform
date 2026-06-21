"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadEvidence } from "@/lib/evidence-api-client";
import { mapUploadedEvidenceItem } from "@/lib/map-uploaded-evidence";
import type { PresentedEvidenceItem } from "@/lib/present-evidence";
import { uiLabel } from "@/lib/ui-labels";
import { useToast } from "@/hooks/use-toast";

const STANDARD_OPTIONS = ["1.1", "1.2", "2.1"] as const;

interface EvidenceUploadPanelProps {
  locale: "en" | "ar";
  realWritesEnabled: boolean;
  isSummaryView: boolean;
  onUploaded: (item: PresentedEvidenceItem) => void;
}

export function EvidenceUploadPanel({
  locale,
  realWritesEnabled,
  isSummaryView,
  onUploaded,
}: EvidenceUploadPanelProps): ReactNode {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [standardNumber, setStandardNumber] = useState<string>("1.1");
  const [questionId, setQuestionId] = useState("Q-1-1-1");
  const [uploading, setUploading] = useState(false);

  const canUpload = realWritesEnabled && !isSummaryView;

  const handleUpload = useCallback(async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !canUpload) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("standardNumber", standardNumber);
      formData.set("questionId", questionId.trim());

      const result = await uploadEvidence(formData);
      const item = mapUploadedEvidenceItem({
        evidenceId: result.evidenceId,
        version: result.version,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        scanStatus: result.scanStatus,
        links: [standardNumber, questionId.trim()],
        uploadedAt: new Date().toISOString(),
      });

      onUploaded(item);

      if (result.scanStatus === "infected") {
        toast({
          variant: "destructive",
          title: uiLabel("evidenceUploadInfected", locale),
        });
      } else {
        toast({
          variant: "success",
          title: uiLabel("evidenceUploadSuccess", locale),
        });
      }

      if (fileRef.current) {
        fileRef.current.value = "";
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : uiLabel("evidenceErrorDemo", locale);
      toast({
        variant: "destructive",
        title: uiLabel("evidenceErrorDemo", locale),
        description: message,
      });
    } finally {
      setUploading(false);
    }
  }, [
    canUpload,
    locale,
    onUploaded,
    questionId,
    standardNumber,
    toast,
  ]);

  if (!canUpload) return null;

  return (
    <div className="space-y-3 rounded-md border border-dashed border-border p-4">
      <p className="text-sm font-medium">{uiLabel("evidenceUpload", locale)}</p>
      <p className="text-xs text-muted-foreground">
        {uiLabel("evidenceUploadHint", locale)}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">
            {uiLabel("evidenceUploadStandard", locale)}
          </span>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={standardNumber}
            onChange={(e) => setStandardNumber(e.target.value)}
            disabled={uploading}
          >
            {STANDARD_OPTIONS.map((std) => (
              <option key={std} value={std}>{std}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">
            {uiLabel("evidenceUploadQuestion", locale)}
          </span>
          <input
            type="text"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
            value={questionId}
            onChange={(e) => setQuestionId(e.target.value)}
            disabled={uploading}
          />
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">
            {uiLabel("evidenceUploadFile", locale)}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            className="w-full text-sm"
            disabled={uploading}
          />
        </label>
      </div>
      <Button
        size="sm"
        className="gap-2"
        onClick={() => void handleUpload()}
        disabled={uploading}
      >
        <Upload className="h-4 w-4" aria-hidden />
        {uiLabel("evidenceUpload", locale)}
      </Button>
    </div>
  );
}
