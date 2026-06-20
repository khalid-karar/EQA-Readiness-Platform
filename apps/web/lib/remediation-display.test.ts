import { describe, expect, it } from "vitest";
import {
  overdueDaysLabel,
  remediationScheduleLabel,
  remediationTrackLabel,
} from "./remediation-display";

describe("remediation display helpers", () => {
  it("overdueDaysLabel returns a single overdue phrase", () => {
    expect(overdueDaysLabel("en", 5)).toBe("5 days overdue");
    expect(overdueDaysLabel("en", 1)).toBe("1 day overdue");
    expect(overdueDaysLabel("ar", 5)).toBe("5 يوم متأخر");
    expect(overdueDaysLabel("ar", 1)).toBe("يوم واحد متأخر");
  });

  it("remediationScheduleLabel includes day count when overdue", () => {
    expect(remediationScheduleLabel("en", true, false, 5)).toBe(
      "5 days overdue",
    );
    expect(remediationScheduleLabel("en", false, false, 0)).toBe("On track");
    expect(remediationScheduleLabel("en", true, true, 5)).toBe("Closed");
    expect(remediationScheduleLabel("ar", true, false, 3)).toBe("3 يوم متأخر");
  });

  it("remediationTrackLabel returns oversight labels without dates", () => {
    expect(remediationTrackLabel("en", true, false)).toBe("Overdue");
    expect(remediationTrackLabel("en", false, false)).toBe("On track");
    expect(remediationTrackLabel("en", true, true)).toBe("Closed");
    expect(remediationTrackLabel("ar", true, false)).toBe("متأخر");
  });
});
