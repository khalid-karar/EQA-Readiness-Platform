import { NextResponse } from "next/server";

// Always evaluated at request time so the probe reflects live process state.
export const dynamic = "force-dynamic";

export interface HealthPayload {
  status: "ok";
  service: "eqa-web";
  timestamp: string;
}

export function GET(): NextResponse<HealthPayload> {
  return NextResponse.json({
    status: "ok",
    service: "eqa-web",
    timestamp: new Date().toISOString(),
  });
}
