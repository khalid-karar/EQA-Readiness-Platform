import { authorize, ForbiddenError, PERMISSIONS } from "@eqa/auth";
import { createTenantRepositories, resolveActiveAssessmentId } from "@eqa/db";
import { getServerSession } from "@/lib/auth/get-server-session";
import { getReportRuntime } from "@/lib/report-runtime";
import { isRealWritesEnabled } from "@/lib/real-writes";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const session = await getServerSession();
  if (!session) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    authorize(session, PERMISSIONS.READ);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return Response.json({ error: "Forbidden." }, { status: 403 });
    }
    throw error;
  }

  if (!isRealWritesEnabled()) {
    return Response.json({ error: "Real writes are not enabled." }, { status: 503 });
  }

  const urlParam = new URL(request.url).searchParams.get("assessmentId");

  try {
    const runtime = getReportRuntime();
    const repos = createTenantRepositories(runtime.db, session, {
      objectStore: runtime.objectStore,
    });
    const assessmentId =
      urlParam ?? (await resolveActiveAssessmentId(repos.kv));
    const latest = await repos.evidencePack.getLatest(assessmentId);
    if (!latest) {
      return Response.json({ error: "No evidence pack export found." }, { status: 404 });
    }

    const pdf = await repos.evidencePack.readPdfBytes(latest.objectKey);
    if (!pdf) {
      return Response.json({ error: "Export file not found." }, { status: 404 });
    }

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${latest.fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Download failed.";
    return Response.json({ error: message }, { status: 400 });
  }
}
