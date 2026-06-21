import type {
  InferenceClient,
  InferenceRequest,
  InferenceResult,
  ModelAdapter,
} from "./types";

/**
 * Self-hosted local LLM adapter (Ollama OpenAI-compatible endpoint). Location
 * `local` — inference stays on-box; the Ollama client enforces a localhost-only
 * host allowlist (rule 2).
 */
export class LocalLlmModelAdapter implements ModelAdapter {
  readonly location = "local" as const;
  readonly id: string;

  constructor(private readonly client: InferenceClient) {
    this.id = `local-llm:${client.modelId}`;
  }

  async infer(request: InferenceRequest): Promise<InferenceResult> {
    const output = await this.client.complete(request);
    return { output, model: this.client.modelId };
  }
}
