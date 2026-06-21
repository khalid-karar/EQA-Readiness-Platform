import { authorize, ForbiddenError, PERMISSIONS, type AuthSession } from "@eqa/auth";
import { getServerSessionFromRequest } from "@/lib/auth/get-server-session";
import { enqueueUiActionJob } from "@/lib/jobs";
import { isRealWritesEnabled } from "@/lib/real-writes";

export async function handleUiActionRoute(
  jobName: string,
  request: Request,
  buildPayload: (
    body: Record<string, unknown>,
    session: AuthSession,
  ) => Record<string, unknown>,
): Promise<Response> {
  const session = await getServerSessionFromRequest(request);
  if (!session?.tenant?.schemaName) {
    return Response.json({ error: "authentication_required" }, { status: 401 });
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
    const body = (await request.json()) as Record<string, unknown>;
    const payload = buildPayload(body, session);
    const result = await enqueueUiActionJob(jobName, session, payload);
    return Response.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Action failed.";
    return Response.json({ error: message }, { status: 400 });
  }
}
