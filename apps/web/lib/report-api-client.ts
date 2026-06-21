export async function postReportAction<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { error?: string; result?: T };
  if (!res.ok) {
    throw new Error(data.error ?? "Request failed.");
  }
  return data.result as T;
}

export async function runMockEqaSimulation(body: {
  assessmentId: string;
  contentPackId: string;
  contentVersion: string;
  locale?: "en" | "ar";
}): Promise<{
  simulationId: string;
  kind: string;
  overallScore: number;
  overallLevel: string;
}> {
  return postReportAction("/api/actions/run-mock-eqa", body);
}

export async function generateEvidencePack(body: {
  assessmentId: string;
  contentPackId: string;
  contentVersion: string;
  locale?: "en" | "ar";
}): Promise<{
  exportId: string;
  kind: string;
  standardCount: number;
  bundledFileCount: number;
  sizeBytes: number;
}> {
  return postReportAction("/api/actions/generate-evidence-pack", body);
}
