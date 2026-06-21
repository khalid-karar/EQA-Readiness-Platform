import { HUMAN_REVIEW_JOB } from "@eqa/workflows";
import { handleUiActionRoute } from "@/lib/api/ui-action-route";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleUiActionRoute(HUMAN_REVIEW_JOB, request, (body) => ({
    findingId: String(body.findingId ?? ""),
    action: String(body.action ?? ""),
    ...(body.editedConclusion === undefined || body.editedConclusion === null
      ? {}
      : { editedConclusion: String(body.editedConclusion) }),
  }));
}
