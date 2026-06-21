import { AiConfigError } from "./errors";
import { assertLocalLlmBaseUrl } from "./host-allowlist";
import type { InferenceClient, InferenceRequest } from "./types";

export interface OllamaClientConfig {
  readonly baseUrl: string;
  readonly modelId: string;
  /** Injectable fetch for tests (must still target an allowed local host). */
  readonly fetchFn?: typeof fetch;
}

const GAP_FLAG_SYSTEM_PROMPT =
  "You are an internal audit readiness assistant. Compare the submitted evidence " +
  "excerpts against the rubric levels provided. Produce a draft gap finding only — " +
  "never a final conclusion. Reference specific rubric levels in your analysis.";

function systemPromptFor(promptVersion: string): string {
  if (promptVersion.startsWith("gap-flag")) {
    return GAP_FLAG_SYSTEM_PROMPT;
  }
  return (
    "You are an internal audit readiness assistant. Produce draft work product " +
    "only — never a final conclusion."
  );
}

function formatUserPrompt(request: InferenceRequest): string {
  const lines = [
    `Prompt template: ${request.promptVersion}`,
    `Rubric version: ${request.rubricVersion}`,
    "",
    "Material to review:",
    ...request.excerpts.map((excerpt, index) => `--- excerpt ${index + 1} ---\n${excerpt}`),
  ];
  if (request.summary) {
    lines.push("", `Summary: ${request.summary}`);
  }
  const meta = Object.entries(request.metadata)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(", ");
  if (meta) {
    lines.push("", `Metadata: ${meta}`);
  }
  return lines.join("\n");
}

/** OpenAI-compatible chat completion against a local Ollama endpoint. */
export function createOllamaInferenceClient(
  config: OllamaClientConfig,
): InferenceClient {
  const baseUrl = assertLocalLlmBaseUrl(config.baseUrl);
  const modelId = config.modelId.trim();
  if (!modelId) {
    throw new AiConfigError("AI_MODEL is required for the local-llm adapter.");
  }

  const fetchFn = config.fetchFn ?? fetch;

  return {
    modelId,
    async complete(request: InferenceRequest): Promise<string> {
      const endpoint = `${baseUrl}/v1/chat/completions`;
      assertLocalLlmBaseUrl(endpoint);

      const response = await fetchFn(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelId,
          messages: [
            { role: "system", content: systemPromptFor(request.promptVersion) },
            { role: "user", content: formatUserPrompt(request) },
          ],
          temperature: 0.2,
          stream: false,
        }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new AiConfigError(
          `Ollama request failed (${response.status}): ${detail.slice(0, 200)}`,
        );
      }

      const body = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = body.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new AiConfigError("Ollama returned an empty completion.");
      }
      return content;
    },
  };
}

export function createOllamaInferenceClientFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): InferenceClient {
  const baseUrl = env.AI_BASE_URL ?? "http://localhost:11434";
  const modelId = env.AI_MODEL ?? "llama3.2";
  return createOllamaInferenceClient({ baseUrl, modelId });
}
