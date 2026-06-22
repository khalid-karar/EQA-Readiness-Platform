import { NextResponse } from "next/server";
import { isDemoFixturesEnabled } from "@/lib/demo-fixtures";
import { isDatabaseConfigured } from "@/lib/db";

// Always evaluated at request time so the probe reflects live process state.
export const dynamic = "force-dynamic";

export interface HealthPayload {
  status: "ok";
  service: "eqa-web";
  timestamp: string;
  databaseConfigured?: boolean;
  demoFixturesEnabled?: boolean;
}

export function GET(): NextResponse<HealthPayload> {
  const payload: HealthPayload = {
    status: "ok",
    service: "eqa-web",
    timestamp: new Date().toISOString(),
  };
  if (process.env.EQA_E2E_TEST_AUTH === "true") {
    payload.databaseConfigured = isDatabaseConfigured();
    payload.demoFixturesEnabled = isDemoFixturesEnabled();
  }
  return NextResponse.json(payload);
}
