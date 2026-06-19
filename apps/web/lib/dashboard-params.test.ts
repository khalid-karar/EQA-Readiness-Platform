import { describe, expect, it } from "vitest";
import { parseLocale, parseRole } from "./dashboard-params";

describe("dashboard URL params", () => {
  it("parseLocale defaults to en", () => {
    expect(parseLocale(undefined)).toBe("en");
    expect(parseLocale("ar")).toBe("ar");
    expect(parseLocale("fr")).toBe("en");
  });

  it("parseRole defaults to cae and rejects unknown", () => {
    expect(parseRole(undefined)).toBe("cae");
    expect(parseRole("board")).toBe("board");
    expect(parseRole("audit_staff")).toBe("audit_staff");
    expect(parseRole("admin")).toBe("cae");
  });
});
