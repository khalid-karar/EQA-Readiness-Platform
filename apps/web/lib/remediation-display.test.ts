import { describe, expect, it } from "vitest";
import { remediationTrackLabel } from "./remediation-display";

describe("remediation display helpers", () => {
  it("remediationTrackLabel returns oversight labels without dates", () => {
    expect(remediationTrackLabel("en", true, false)).toBe("Overdue");
    expect(remediationTrackLabel("en", false, false)).toBe("On track");
    expect(remediationTrackLabel("en", true, true)).toBe("Closed");
    expect(remediationTrackLabel("ar", true, false)).toBe("متأخر");
  });
});
