import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ContentCatalog } from "./catalog";
import { ContentValidationError, ContentVersionImmutableError } from "./errors";
import { loadContentPack } from "./loader";
import { localize } from "./localize";
import { loadBundledCatalog } from "./seeds";
import type { LocalizedText, Standard } from "./types";
import { validateContentPack } from "./validate";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "__fixtures__");
const fixture = (name: string): string => join(fixtures, name);

function eachLocalized(standard: Standard): LocalizedText[] {
  return [
    standard.title,
    ...standard.questions.map((q) => q.text),
    ...standard.evidencePrompts.map((e) => e.text),
    ...standard.rubric.levels.flatMap((l) => [l.label, l.descriptor]),
    ...standard.reviewChecklist.map((c) => c.text),
  ];
}

describe("content loading (config-driven)", () => {
  it("loads the synthetic domain pack from its seed file", () => {
    const catalog = loadBundledCatalog();
    const pack = catalog.get("eqa-foundations", "1.0.0");

    expect(pack.meta.taxonomyVersion).toBe("IIA-GIAS-2024");
    expect(pack.meta.approvalStatus).toBe("approved");
    expect(pack.meta.changelog.length).toBeGreaterThan(0);
    expect(pack.contentHash).toMatch(/^[0-9a-f]{64}$/);

    expect(pack.domains).toHaveLength(1);
    const domain = pack.domains[0];
    expect(domain?.number).toBe("I");
    expect(domain?.principles).toHaveLength(2);

    const standard = domain?.principles[0]?.standards[0];
    expect(standard?.number).toBe("1.1");
    expect(standard?.questions[0]?.id).toBe("Q-1-1-1");
    expect(standard?.rubric.levels).toHaveLength(4);
    expect(standard?.reviewChecklist.length).toBeGreaterThan(0);
  });

  it("changes content when the seed file is swapped — no code change", () => {
    const a = loadContentPack(fixture("swap-a.json"));
    const b = loadContentPack(fixture("swap-b.json"));

    expect(a.domains[0]?.title.en).toBe("Alpha Domain");
    expect(b.domains[0]?.title.en).toBe("Beta Domain");
    expect(a.contentHash).not.toBe(b.contentHash);
  });

  it("resolves bilingual fields", () => {
    const pack = loadBundledCatalog().get("eqa-foundations", "1.0.0");
    const standard = pack.domains[0]?.principles[0]?.standards[0];
    if (!standard) throw new Error("expected a standard");

    expect(localize(standard.title, "en")).toBe("Ethical Expectations");
    expect(localize(standard.title, "ar")).toBe("التوقعات الأخلاقية");

    // Every bilingual field across the standard has both languages populated.
    for (const text of eachLocalized(standard)) {
      expect(text.en.length).toBeGreaterThan(0);
      expect(text.ar.length).toBeGreaterThan(0);
      expect(localize(text, "ar")).toBe(text.ar);
    }
  });

  it("rejects a seed missing a required bilingual field", () => {
    const bad = {
      taxonomy_version: "t",
      content_pack: "x",
      version: "1.0.0",
      author: "a",
      reviewer: "r",
      approval_status: "draft",
      effective_date: "2026-01-01",
      changelog: [],
      domains: [
        {
          id: "D1",
          number: "I",
          title: { en: "only english" },
          principles: [],
        },
      ],
    };
    expect(() => validateContentPack(bad)).toThrow(ContentValidationError);
    try {
      validateContentPack(bad);
    } catch (error) {
      expect((error as ContentValidationError).path).toContain("title.ar");
    }
  });
});

describe("content versioning & immutability", () => {
  it("keeps an in-flight assessment pinned when content is revised", () => {
    const catalog = new ContentCatalog();
    const v1 = loadContentPack(fixture("ver-v1.json"));
    catalog.register(v1);

    // An assessment starts on v1 and pins it.
    const pin = catalog.pinForAssessment("assessment-1", "ver-demo", "1.0.0");
    expect(catalog.isInUse("ver-demo", "1.0.0")).toBe(true);

    // Editing that same version in place is rejected — versions are immutable.
    const tampered = loadContentPack(fixture("ver-v1-modified.json"));
    expect(() => catalog.register(tampered)).toThrow(
      ContentVersionImmutableError,
    );

    // The revision is published as a NEW version instead.
    const v2 = loadContentPack(fixture("ver-v2.json"));
    catalog.register(v2);
    expect(catalog.listVersions("ver-demo")).toEqual(["1.0.0", "2.0.0"]);
    expect(catalog.latest("ver-demo").meta.version).toBe("2.0.0");
    expect(
      catalog.latest("ver-demo").domains[0]?.principles[0]?.standards[0]
        ?.questions[0]?.text.en,
    ).toBe("Revised question");

    // The in-flight assessment still resolves the exact v1 content.
    const resolved = catalog.resolvePin(pin);
    expect(resolved.meta.version).toBe("1.0.0");
    expect(resolved.contentHash).toBe(v1.contentHash);
    expect(
      resolved.domains[0]?.principles[0]?.standards[0]?.questions[0]?.text.en,
    ).toBe("Original question");
  });

  it("re-registering identical content is idempotent", () => {
    const catalog = new ContentCatalog();
    catalog.register(loadContentPack(fixture("ver-v1.json")));
    expect(() =>
      catalog.register(loadContentPack(fixture("ver-v1.json"))),
    ).not.toThrow();
    expect(catalog.listVersions("ver-demo")).toEqual(["1.0.0"]);
  });

  it("freezes loaded content so it cannot be mutated at runtime", () => {
    const pack = loadContentPack(fixture("ver-v1.json"));
    expect(() => {
      // @ts-expect-error intentional illegal mutation of a frozen value
      pack.domains[0].number = "X";
    }).toThrow();
  });
});
