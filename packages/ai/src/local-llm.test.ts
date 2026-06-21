import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createModelAdapter,
  createModelAdapterFromEnv,
  LocalStubModelAdapter,
} from "./adapters";
import { AiConfigError, DataMinimizationError } from "./errors";
import { LocalLlmModelAdapter } from "./local-llm-adapter";
import { assertLocalLlmBaseUrl, isAllowedLocalLlmUrl } from "./host-allowlist";
import { createOllamaInferenceClient } from "./ollama-client";
import { AiReviewService } from "./service";
import type { EvidenceReviewInput, Identity } from "./types";

const IDENTITIES: Identity[] = [{ name: "Khalid Al-Otaibi", role: "cae" }];

function reviewInput(
  overrides: Partial<EvidenceReviewInput> = {},
): EvidenceReviewInput {
  return {
    promptVersion: "gap-flag@1.0.0",
    rubricVersion: "1.0.0",
    excerpts: ["Khalid Al-Otaibi signed the quarterly reconciliation."],
    metadata: { standard: "1.1" },
    identities: IDENTITIES,
    ...overrides,
  };
}

describe("local-llm Ollama adapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects external AI_BASE_URL hosts (rule 2)", () => {
    expect(isAllowedLocalLlmUrl("https://api.openai.com")).toBe(false);
    expect(() => assertLocalLlmBaseUrl("https://api.openai.com")).toThrow(
      AiConfigError,
    );
    expect(() =>
      createOllamaInferenceClient({
        baseUrl: "https://api.openai.com",
        modelId: "gpt-4",
      }),
    ).toThrow(AiConfigError);
  });

  it("accepts localhost Ollama and never contacts an external host", async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      const host = new URL(url).hostname;
      expect(["localhost", "127.0.0.1", "[::1]"]).toContain(host);
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "DRAFT: rubric L0 not met." } }],
        }),
      } as Response;
    });
    const client = createOllamaInferenceClient({
      baseUrl: "http://localhost:11434",
      modelId: "llama3.2",
      fetchFn: fetchImpl as unknown as typeof fetch,
    });
    const adapter = createModelAdapter({
      driver: "local-llm",
      client,
    });

    expect(adapter).toBeInstanceOf(LocalLlmModelAdapter);
    expect(adapter.id).toBe("local-llm:llama3.2");

    const outcome = await new AiReviewService(adapter).review(
      reviewInput({ excerpts: ["Synthetic excerpt only."] }),
    );
    expect(outcome.result.output).toContain("DRAFT");
    expect(fetchImpl).toHaveBeenCalledOnce();
    const calledUrl = String(fetchImpl.mock.calls[0]?.[0]);
    expect(calledUrl).toMatch(/^http:\/\/localhost:11434/);
    expect(calledUrl).not.toMatch(/openai|anthropic|googleapis/);
  });

  it("runs minimization before any network call", async () => {
    const fetchImpl = vi.fn() as typeof fetch;
    const client = createOllamaInferenceClient({
      baseUrl: "http://localhost:11434",
      modelId: "test-model",
      fetchFn: fetchImpl as unknown as typeof fetch,
    });
    const adapter = createModelAdapter({ driver: "local-llm", client });
    const service = new AiReviewService(adapter);

    await expect(
      service.review(
        reviewInput({ excerpts: ["A".repeat(5000)] }),
      ),
    ).rejects.toBeInstanceOf(DataMinimizationError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("redacts personal names before the Ollama request body is sent", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      const body = String(init?.body ?? "");
      expect(body).not.toMatch(/Khalid/);
      expect(body).toContain("[CAE]");
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "DRAFT OUTPUT" } }],
        }),
      } as Response;
    });

    const client = createOllamaInferenceClient({
      baseUrl: "http://localhost:11434",
      modelId: "test-model",
      fetchFn: fetchImpl as unknown as typeof fetch,
    });
    await new AiReviewService(
      createModelAdapter({ driver: "local-llm", client }),
    ).review(reviewInput());
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("records full provenance after a local-llm call (rule 12)", async () => {
    const client = createOllamaInferenceClient({
      baseUrl: "http://127.0.0.1:11434",
      modelId: "mistral",
      fetchFn: (async () =>
        ({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: "DRAFT OUTPUT" } }],
          }),
        }) as Response) as typeof fetch,
    });
    const adapter = createModelAdapter({ driver: "local-llm", client });
    const outcome = await new AiReviewService(adapter, {
      now: () => new Date("2026-06-01T12:00:00.000Z"),
    }).review(reviewInput({ excerpts: ["Evidence excerpt only."] }));

    expect(outcome.provenance.modelAdapter).toBe("local-llm:mistral");
    expect(outcome.provenance.adapterLocation).toBe("local");
    expect(outcome.provenance.promptVersion).toBe("gap-flag@1.0.0");
    expect(outcome.provenance.rubricVersion).toBe("1.0.0");
    expect(outcome.provenance.output).toBe("DRAFT OUTPUT");
    expect(outcome.provenance.timestamp).toBe("2026-06-01T12:00:00.000Z");
    expect(outcome.provenance.inputSummary).toContain("prompt=");
    expect(outcome.provenance.inputSummary).not.toMatch(/Khalid/);
  });

  it("builds local-llm from env and keeps local-stub as CI default", () => {
    const stub = createModelAdapterFromEnv({}, { AI_ADAPTER: "local-stub" });
    expect(stub).toBeInstanceOf(LocalStubModelAdapter);

    const llm = createModelAdapterFromEnv(
      {
        client: {
          modelId: "env-model",
          complete: () => Promise.resolve("ok"),
        },
      },
      { AI_ADAPTER: "local-llm" },
    );
    expect(llm.id).toBe("local-llm:env-model");
  });
});
