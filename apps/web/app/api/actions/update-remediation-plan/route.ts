import { UPDATE_REMEDIATION_PLAN_JOB } from "@eqa/workflows";
import { handleUiActionRoute } from "@/lib/api/ui-action-route";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleUiActionRoute(UPDATE_REMEDIATION_PLAN_JOB, request, (body) => ({
    remediationId: String(body.remediationId ?? ""),
    ...(body.owner === undefined || body.owner === null
      ? {}
      : { owner: String(body.owner) }),
    ...(body.action === undefined || body.action === null
      ? {}
      : { action: String(body.action) }),
    ...(body.targetDate === undefined || body.targetDate === null
      ? {}
      : { targetDate: String(body.targetDate) }),
  }));
}
