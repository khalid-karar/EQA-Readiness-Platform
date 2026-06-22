import { ASSIGN_REMEDIATION_JOB } from "@eqa/workflows";
import { handleUiActionRoute } from "@/lib/api/ui-action-route";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleUiActionRoute(ASSIGN_REMEDIATION_JOB, request, (body) => ({
    assessmentId: String(body.assessmentId ?? ""),
    questionId: String(body.questionId ?? ""),
    standardNumber: String(body.standardNumber ?? ""),
    action: String(body.action ?? ""),
    owner: String(body.owner ?? ""),
    targetDate: String(body.targetDate ?? ""),
  }));
}
