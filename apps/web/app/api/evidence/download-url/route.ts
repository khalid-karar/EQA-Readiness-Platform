import { authorize, ForbiddenError, PERMISSIONS } from "@eqa/auth";
import { EvidenceNotReadyError } from "@eqa/storage";
import { getServerSession } from "@/lib/auth/get-server-session";
import { getAppJobQueue } from "@/lib/jobs";
import { getEvidenceServiceForSession } from "@/lib/evidence-runtime";
import { isRealWritesEnabled } from "@/lib/real-writes";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
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

  try {
    const body = (await request.json()) as {
      evidenceId?: string;
      version?: number;
    };
    const evidenceId = String(body.evidenceId ?? "");
    const version = Number(body.version);
    if (!evidenceId || !Number.isFinite(version)) {
      return Response.json(
        { error: "evidenceId and version are required." },
        { status: 400 },
      );
    }

    const service = await getEvidenceServiceForSession(
      session,
      getAppJobQueue(),
    );
    const signed = await service.createDownloadUrl(evidenceId, version);
    return Response.json({
      ok: true,
      url: signed.url,
      token: signed.token,
      expiresAt: signed.expiresAt,
    });
  } catch (error) {
    if (error instanceof EvidenceNotReadyError) {
      return Response.json({ error: error.message }, { status: 403 });
    }
    const message =
      error instanceof Error ? error.message : "Download URL failed.";
    return Response.json({ error: message }, { status: 400 });
  }
}
