import { describe, expect, it } from "vitest";
import { GET, type HealthPayload } from "./route";

describe("GET /health", () => {
  it("responds 200 with an ok status", async () => {
    const res = GET();
    expect(res.status).toBe(200);

    const body = (await res.json()) as HealthPayload;
    expect(body.status).toBe("ok");
    expect(body.service).toBe("eqa-web");
    expect(typeof body.timestamp).toBe("string");
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });
});
