import { authorize, ForbiddenError, PERMISSIONS } from "@eqa/auth";
import { getServerSession } from "@/lib/auth/get-server-session";
import { getAppJobQueue, awaitEvidenceScan } from "@/lib/jobs";
import { getEvidenceServiceForSession } from "@/lib/evidence-runtime";
import { isRealWritesEnabled } from "@/lib/real-writes";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const session = await getServerSession();
  if (!session) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    authorize(session, PERMISSIONS.WRITE);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return Response.json({ error: "Forbidden." }, { status: 403 });
    }
    throw error;
  }

  if (!isRealWritesEnabled()) {
    return Response.json({ error: "Real writes are not enabled." }, { status: 503 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const standardNumber = String(formData.get("standardNumber") ?? "").trim();
    const questionId = String(formData.get("questionId") ?? "").trim();

    if (!(file instanceof File)) {
      return Response.json({ error: "A file is required." }, { status: 400 });
    }
    if (!standardNumber || !questionId) {
      return Response.json(
        { error: "standardNumber and questionId are required." },
        { status: 400 },
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const queue = getAppJobQueue();
    const service = await getEvidenceServiceForSession(session, queue);
    const uploaded = await service.upload({
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      bytes,
      links: [standardNumber, questionId],
    });

    const scanStatus = await awaitEvidenceScan(
      session,
      uploaded.evidenceId,
      uploaded.version,
    );

    return Response.json({
      ok: true,
      result: {
        evidenceId: uploaded.evidenceId,
        version: uploaded.version,
        scanStatus,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return Response.json({ error: message }, { status: 400 });
  }
}
