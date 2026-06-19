import { loadBundledCatalog } from "./seeds";
import {
  checklistItemsForStandard,
  resolveChecklistItems,
  type ReviewChecklistPin,
} from "./working-paper-review";
import { ContentPinMismatchError } from "./errors";
import { describe, expect, it } from "vitest";

describe("working-paper review content references (Step 5 checklist)", () => {
  const catalog = loadBundledCatalog();
  const pack = catalog.get("eqa-foundations", "1.0.0");
  const pin: ReviewChecklistPin = {
    contentPackId: pack.meta.contentPackId,
    version: pack.meta.version,
    contentHash: pack.contentHash,
  };

  it("returns checklist items from the content pack without duplicating them", () => {
    const items = checklistItemsForStandard(pack, "1.1");
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]?.id).toBeDefined();
    expect(items[0]?.text.en).toBeTruthy();
    expect(items[0]?.text.ar).toBeTruthy();
  });

  it("resolves checklist items from a pinned content version", () => {
    const items = resolveChecklistItems(catalog, pin, "1.1");
    expect(items).toEqual(checklistItemsForStandard(pack, "1.1"));
  });

  it("fails closed when the pin hash does not match the catalog", () => {
    const tampered: ReviewChecklistPin = {
      ...pin,
      contentHash: "0".repeat(64),
    };
    expect(() => resolveChecklistItems(catalog, tampered, "1.1")).toThrow(
      ContentPinMismatchError,
    );
  });
});
