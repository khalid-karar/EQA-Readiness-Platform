import { RECORD_CONFORMANCE_JOB } from "@eqa/workflows";
import { handleUiActionRoute } from "@/lib/api/ui-action-route";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleUiActionRoute(RECORD_CONFORMANCE_JOB, request, (body) => ({
    checklistId: String(body.checklistId ?? ""),
    checklistItemId: String(body.checklistItemId ?? ""),
    conformance: String(body.conformance ?? ""),
    ...(body.note === undefined || body.note === null
      ? {}
      : { note: String(body.note) }),
  }));
}
