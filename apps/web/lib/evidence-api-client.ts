export interface UploadEvidenceResult {
  evidenceId: string;
  version: number;
  scanStatus: string;
}

export async function uploadEvidence(
  formData: FormData,
): Promise<UploadEvidenceResult> {
  const res = await fetch("/api/evidence/upload", {
    method: "POST",
    body: formData,
  });
  const data = (await res.json()) as {
    error?: string;
    result?: UploadEvidenceResult;
  };
  if (!res.ok) {
    throw new Error(data.error ?? "Upload failed.");
  }
  return data.result as UploadEvidenceResult;
}

export async function getEvidenceDownloadUrl(
  evidenceId: string,
  version: number,
): Promise<string> {
  const res = await fetch("/api/evidence/download-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ evidenceId, version }),
  });
  const data = (await res.json()) as { error?: string; url?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Download URL failed.");
  }
  return data.url as string;
}
