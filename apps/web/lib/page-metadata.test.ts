import { describe, expect, it } from "vitest";
import { buildPageMetadata } from "./page-metadata";

describe("page-metadata", () => {
  it("localizes dashboard title and description for Arabic", () => {
    const meta = buildPageMetadata("dashboard", "ar");
    expect(meta.title).toContain("لوحة الجاهزية");
    expect(meta.description).toMatch(/سيرة/);
    expect(meta.openGraph?.locale).toBe("ar_SA");
  });

  it("includes Maya mark in open graph images", () => {
    const meta = buildPageMetadata("evidence", "en");
    const images = meta.openGraph?.images;
    expect(images).toBeDefined();
    const serialized = JSON.stringify(images);
    expect(serialized).toContain("maya-ai-mark.png");
  });
});
