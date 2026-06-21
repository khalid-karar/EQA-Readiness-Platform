import { SUBMIT_RESPONSE_JOB } from "@eqa/workflows";
import { handleUiActionRoute } from "@/lib/api/ui-action-route";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleUiActionRoute(SUBMIT_RESPONSE_JOB, request, (body) => ({
    assessmentId: String(body.assessmentId ?? ""),
    questionId: String(body.questionId ?? ""),
    answer: String(body.answer ?? ""),
    ...(body.note === undefined || body.note === null
      ? {}
      : { note: String(body.note) }),
    pin: body.pin as Record<string, unknown>,
  }));
}
