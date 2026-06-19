import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ContentCatalog, loadContentPack } from "@eqa/content";
import type { ContentPin } from "@eqa/content";
import { describe, expect, it } from "vitest";
import { QuestionnaireEngine } from "./engine";
import { PinContentMismatchError, UnknownQuestionError } from "./errors";
import { renderQuestionnaire } from "./render";
import type {
  AssessmentResponse,
  AssessmentResponseInput,
  ResponseStore,
} from "./types";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "__fixtures__");
const fixture = (name: string): string => join(fixtures, name);

class FakeResponseStore implements ResponseStore {
  readonly submitted: AssessmentResponseInput[] = [];

  submit(input: AssessmentResponseInput): Promise<void> {
    this.submitted.push(input);
    return Promise.resolve();
  }

  getForAssessment(assessmentId: string): Promise<AssessmentResponse[]> {
    return Promise.resolve(
      this.submitted
        .filter((r) => r.assessmentId === assessmentId)
        .map((r) => ({
          ...r,
          note: r.note ?? null,
          respondedBy: "tester",
          respondedAt: "2026-01-01T00:00:00.000Z",
        })),
    );
  }
}

function pinFor(filePath: string): {
  pin: ContentPin;
  pack: ReturnType<typeof loadContentPack>;
} {
  const pack = loadContentPack(filePath);
  const catalog = new ContentCatalog();
  catalog.register(pack);
  const pin = catalog.pinForAssessment(
    "assessment-1",
    pack.meta.contentPackId,
    pack.meta.version,
  );
  return { pin, pack };
}

describe("renderQuestionnaire (config-driven)", () => {
  it("renders the questionnaire from seed content", () => {
    const pack = loadContentPack(fixture("qa-a.json"));
    const view = renderQuestionnaire(pack, "en");

    expect(view.contentPackId).toBe("qa-demo");
    expect(view.domains[0]?.title).toBe("Alpha Domain");
    const standard = view.domains[0]?.principles[0]?.standards[0];
    expect(standard?.questions[0]?.questionId).toBe("Q1");
    expect(standard?.questions[0]?.text).toBe("Alpha question one");
    expect(standard?.rubric[0]?.label).toBe("Not met");
  });

  it("changes the questionnaire when the seed file is swapped — no code change", () => {
    const a = renderQuestionnaire(loadContentPack(fixture("qa-a.json")), "en");
    const b = renderQuestionnaire(loadContentPack(fixture("qa-b.json")), "en");

    expect(a.domains[0]?.title).toBe("Alpha Domain");
    expect(b.domains[0]?.title).toBe("Beta Domain");
    expect(a.domains[0]?.principles[0]?.standards[0]?.questions).toHaveLength(
      1,
    );
    expect(b.domains[0]?.principles[0]?.standards[0]?.questions).toHaveLength(
      2,
    );
  });

  it("renders bilingual content in the requested locale", () => {
    const pack = loadContentPack(fixture("qa-a.json"));
    const ar = renderQuestionnaire(pack, "ar");

    expect(ar.domains[0]?.title).toBe("نطاق ألفا");
    expect(ar.domains[0]?.principles[0]?.standards[0]?.questions[0]?.text).toBe(
      "سؤال ألفا الأول",
    );
  });
});

describe("QuestionnaireEngine", () => {
  it("submits a response carrying the assessment's content pin", async () => {
    const { pin, pack } = pinFor(fixture("qa-a.json"));
    const store = new FakeResponseStore();
    const engine = new QuestionnaireEngine(pack, pin, store);

    await engine.answer("Q1", "2", "synthetic note");

    expect(store.submitted).toHaveLength(1);
    const submitted = store.submitted[0];
    expect(submitted?.assessmentId).toBe("assessment-1");
    expect(submitted?.questionId).toBe("Q1");
    expect(submitted?.answer).toBe("2");
    expect(submitted?.note).toBe("synthetic note");
    // The pin ties the answer to the exact content version + bytes.
    expect(submitted?.pin.contentPackId).toBe("qa-demo");
    expect(submitted?.pin.version).toBe("1.0.0");
    expect(submitted?.pin.contentHash).toBe(pack.contentHash);
  });

  it("rejects answering a question that is not in the content pack", async () => {
    const { pin, pack } = pinFor(fixture("qa-a.json"));
    const engine = new QuestionnaireEngine(pack, pin, new FakeResponseStore());

    await expect(engine.answer("does-not-exist", "1")).rejects.toBeInstanceOf(
      UnknownQuestionError,
    );
  });

  it("refuses a pin that does not match the supplied content pack", () => {
    const pack = loadContentPack(fixture("qa-a.json"));
    const tamperedPin: ContentPin = {
      assessmentId: "assessment-1",
      contentPackId: pack.meta.contentPackId,
      version: pack.meta.version,
      contentHash: "0".repeat(64),
    };
    expect(
      () => new QuestionnaireEngine(pack, tamperedPin, new FakeResponseStore()),
    ).toThrow(PinContentMismatchError);
  });
});
