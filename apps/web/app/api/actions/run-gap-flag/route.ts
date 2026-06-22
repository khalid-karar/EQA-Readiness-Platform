import { authorize, ForbiddenError, PERMISSIONS } from "@eqa/auth";
import { loadBundledCatalog } from "@eqa/content";
import {
  createTenantRepositories,
  resolveActiveAssessmentPin,
} from "@eqa/db";
import { AI_GAP_FLAG_JOB } from "@eqa/workflows";
import { getServerSessionFromRequest } from "@/lib/auth/get-server-session";
import { getAppDatabase } from "@/lib/db";
import { enqueueUiActionJob } from "@/lib/jobs";
import { isRealWritesEnabled } from "@/lib/real-writes";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
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
    const questionId = String(body.questionId ?? "").trim();
    const standardNumber = String(body.standardNumber ?? "").trim();
    const locale =
      body.locale === "ar" || body.locale === "en" ? body.locale : undefined;

    if (!questionId || !standardNumber) {
      return Response.json(
        { error: "questionId and standardNumber are required." },
        { status: 400 },
      );
    }

    const catalog = loadBundledCatalog();
    const repos = createTenantRepositories(getAppDatabase(), session);
    const pin = await resolveActiveAssessmentPin(repos.kv, catalog);
    const evidenceRows = await repos.evidence.list();
    const linked = evidenceRows.filter(
      (row) =>
        row.links.includes(questionId) || row.links.includes(standardNumber),
    );
    const clean = linked.filter((row) => row.scanStatus === "clean");
    if (clean.length === 0) {
      return Response.json(
        {
          error:
            "At least one cleared (non-quarantined) evidence item must be linked before AI gap-flagging.",
        },
        { status: 400 },
      );
    }

    const excerpts = clean.map(
      (row) => `Evidence file "${row.fileName}" (${row.contentType}).`,
    );

    const result = await enqueueUiActionJob(AI_GAP_FLAG_JOB, session, {
      questionId,
      standardNumber,
      pin,
      evidence: { excerpts, identities: [] },
      ...(locale ? { locale } : {}),
    });

    return Response.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Action failed.";
    return Response.json({ error: message }, { status: 400 });
  }
}
