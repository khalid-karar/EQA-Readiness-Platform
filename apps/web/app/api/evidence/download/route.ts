import { authorize, ForbiddenError, PERMISSIONS } from "@eqa/auth";
import {
  EvidenceNotReadyError,
  InvalidSignedUrlError,
  SignedUrlExpiredError,
} from "@eqa/storage";
import { getServerSession } from "@/lib/auth/get-server-session";
import { getAppJobQueue } from "@/lib/jobs";
import { getEvidenceServiceForSession } from "@/lib/evidence-runtime";
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

  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return Response.json({ error: "Missing download token." }, { status: 400 });
  }

  try {
    const service = await getEvidenceServiceForSession(
      session,
      getAppJobQueue(),
    );
    const { bytes, metadata } = await service.resolveDownload(token);
    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": metadata.contentType,
        "Content-Disposition": `attachment; filename="${metadata.fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (
      error instanceof EvidenceNotReadyError ||
      error instanceof InvalidSignedUrlError ||
      error instanceof SignedUrlExpiredError
    ) {
      return Response.json({ error: error.message }, { status: 403 });
    }
    const message =
      error instanceof Error ? error.message : "Download failed.";
    return Response.json({ error: message }, { status: 400 });
  }
}
