import { loadBundledCatalog } from "@eqa/content";
import { describe, expect, it } from "vitest";
import {
  aggregateEngagementConformance,
  buildChecklistReviewView,
  countConformance,
  type EngagementHierarchy,
} from "./working-paper-review";

const PACK_ID = "eqa-foundations";
const PACK_VERSION = "1.0.0";
const STANDARD = "1.1";

describe("working-paper review pure logic (Step 12)", () => {
  const catalog = loadBundledCatalog();
  const pack = catalog.get(PACK_ID, PACK_VERSION);
  const pin = {
    contentPackId: pack.meta.contentPackId,
    version: pack.meta.version,
    contentHash: pack.contentHash,
  };
  const contentItems =
    pack.domains[0]?.principles[0]?.standards[0]?.reviewChecklist ?? [];
  const itemIds = contentItems.map((i) => i.id);

  const checklist = {
    checklistId: "chk-1",
    workingPaperId: "wp-1",
    standardNumber: STANDARD,
    pin,
    createdBy: "reviewer",
    createdAt: "2026-06-19T12:00:00.000Z",
  };

  it("countConformance tallies conforms, gaps, and unreviewed items", () => {
    const counts = countConformance(itemIds, [
      {
        resultId: "r1",
        checklistId: "chk-1",
        checklistItemId: itemIds[0] ?? "",
        conformance: "conforms",
        note: null,
        recordedBy: "u",
        recordedAt: "t",
      },
      {
        resultId: "r2",
        checklistId: "chk-1",
        checklistItemId: itemIds[1] ?? "",
        conformance: "does_not_conform",
        note: "Gap",
        recordedBy: "u",
        recordedAt: "t",
      },
    ]);
    expect(counts.totalItems).toBe(itemIds.length);
    expect(counts.conforms).toBe(1);
    expect(counts.doesNotConform).toBe(1);
    expect(counts.unreviewed).toBe(Math.max(0, itemIds.length - 2));
  });

  it("buildChecklistReviewView resolves item text from pinned content", () => {
    const view = buildChecklistReviewView(catalog, checklist, []);
    expect(view.pin.contentHash).toBe(pin.contentHash);
    expect(view.items).toHaveLength(contentItems.length);
    expect(view.items[0]?.text.en).toBe(contentItems[0]?.text.en);
    expect(view.items.every((i) => i.result === null)).toBe(true);
  });

  it("aggregateEngagementConformance rolls up per standard", () => {
    const hierarchy: EngagementHierarchy = {
      engagement: {
        engagementId: "eng-1",
        title: "Synthetic",
        periodStart: "2025-01-01",
        periodEnd: "2025-12-31",
        status: "completed",
        createdBy: "u",
        createdAt: "t",
      },
      files: [
        {
          file: {
            fileId: "f1",
            engagementId: "eng-1",
            name: "File",
            description: null,
            createdBy: "u",
            createdAt: "t",
          },
          papers: [
            {
              paper: {
                workingPaperId: "wp-1",
                fileId: "f1",
                reference: "WP-1.1",
                title: "Paper",
                preparedBy: "u",
                preparedAt: "t",
              },
              checklists: [checklist],
            },
          ],
        },
      ],
    };

    const results = new Map([
      [
        "chk-1",
        [
          {
            resultId: "r1",
            checklistId: "chk-1",
            checklistItemId: itemIds[0] ?? "",
            conformance: "conforms" as const,
            note: null,
            recordedBy: "u",
            recordedAt: "t",
          },
        ],
      ],
    ]);

    const summary = aggregateEngagementConformance(hierarchy, catalog, results);
    expect(summary.engagementId).toBe("eng-1");
    expect(summary.byStandard).toHaveLength(1);
    expect(summary.byStandard[0]?.standardNumber).toBe(STANDARD);
    expect(summary.byStandard[0]?.pin.contentHash).toBe(pin.contentHash);
    expect(summary.conforms).toBe(1);
    expect(summary.unreviewed).toBe(itemIds.length - 1);
  });
});
