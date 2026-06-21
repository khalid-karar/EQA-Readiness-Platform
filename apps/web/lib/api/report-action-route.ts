import { authorize, ForbiddenError, PERMISSIONS } from "@eqa/auth";
import {
  createTenantRepositories,
  PILOT_ASSESSMENT_ID,
  PILOT_PACK_ID,
  PILOT_PACK_VERSION,
} from "@eqa/db";
import { getServerSession } from "@/lib/auth/get-server-session";
import { awaitJob } from "@/lib/await-job";
import { getAppJobQueue } from "@/lib/jobs";
import { getReportRuntime } from "@/lib/report-runtime";
import { isRealWritesEnabled } from "@/lib/real-writes";

export async function handleReportJobRoute(
  requestJob: (
    repos: ReturnType<typeof createTenantRepositories>,
    body: Record<string, unknown>,
  ) => Promise<{ jobId: string }>,
  request: Request,
): Promise<Response> {
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
    const body = (await request.json()) as Record<string, unknown>;
    const queue = getAppJobQueue();
    const runtime = getReportRuntime();
    const repos = createTenantRepositories(runtime.db, session, {
      jobQueue: queue,
      objectStore: runtime.objectStore,
    });
    const { jobId } = await requestJob(repos, body);
    const record = await awaitJob(queue, jobId);
    if (record.status === "failed") {
      throw new Error(record.error ?? "Job failed.");
    }
    return Response.json({ ok: true, result: record.result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Job failed.";
    return Response.json({ error: message }, { status: 400 });
  }
}

export function pilotReportIds(body: Record<string, unknown>): {
  assessmentId: string;
  contentPackId: string;
  contentVersion: string;
  locale?: "en" | "ar";
} {
  const localeRaw = body.locale;
  const locale =
    localeRaw === "en" || localeRaw === "ar" ? localeRaw : undefined;
  return {
    assessmentId: String(body.assessmentId ?? PILOT_ASSESSMENT_ID),
    contentPackId: String(body.contentPackId ?? PILOT_PACK_ID),
    contentVersion: String(body.contentVersion ?? PILOT_PACK_VERSION),
    ...(locale ? { locale } : {}),
  };
}
