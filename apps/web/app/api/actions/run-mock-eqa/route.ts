import {
  handleReportJobRoute,
  pilotReportIds,
} from "@/lib/api/report-action-route";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleReportJobRoute(async (repos, body) => {
    return repos.mockEqa.requestSimulation(pilotReportIds(body));
  }, request);
}
