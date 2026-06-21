import { REMEDIATION_TRANSITION_JOB } from "@eqa/workflows";
import { handleUiActionRoute } from "@/lib/api/ui-action-route";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleUiActionRoute(REMEDIATION_TRANSITION_JOB, request, (body) => ({
    remediationId: String(body.remediationId ?? ""),
    transition: String(body.transition ?? ""),
    ...(body.retestNote === undefined || body.retestNote === null
      ? {}
      : { retestNote: String(body.retestNote) }),
  }));
}
