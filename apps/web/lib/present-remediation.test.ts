import { describe, expect, it } from "vitest";
import { parseRemediationParams } from "./present-remediation";

describe("remediation presentation params", () => {
  it("parseRemediationParams defaults locale and role", () => {
    expect(parseRemediationParams({})).toEqual({
      locale: "en",
      role: "cae",
    });
    expect(parseRemediationParams({ locale: "ar", role: "board" })).toEqual({
      locale: "ar",
      role: "board",
    });
  });
});
