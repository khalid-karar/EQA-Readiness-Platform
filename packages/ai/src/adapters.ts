import { AiConfigError, ExternalAdapterNotAllowedError } from "./errors";
import type {
  InferenceClient,
  InferenceRequest,
  InferenceResult,
  ModelAdapter,
} from "./types";

/**
 * Local, in-process stub adapter for dev and tests. It performs no network I/O
 * and returns a deterministic draft that references only the (already redacted,
 * minimized) request shape — never the content. Location `local`.
 */
export class LocalStubModelAdapter implements ModelAdapter {
  readonly id = "local-stub";
  readonly location = "local" as const;

  infer(request: InferenceRequest): Promise<InferenceResult> {
    const output =
      `DRAFT (local-stub): reviewed ${request.excerpts.length} excerpt(s) ` +
      `against rubric ${request.rubricVersion} using prompt ${request.promptVersion}. ` +
      "This is draft work product only and requires human review.";
    return Promise.resolve({ output, model: this.id });
  }
}

/**
 * Adapter for a model hosted inside the KSA environment (self-hosted today, a
 * future HUMAIN model tomorrow). The transport is the injected
 * {@link InferenceClient}, so the concrete model is swapped by providing a
 * client — no vendor is hardcoded. Location `in-kingdom`, so it is an allowed
 * path for client evidence.
 */
export class InKingdomModelAdapter implements ModelAdapter {
  readonly location = "in-kingdom" as const;
  readonly id: string;

  constructor(private readonly client: InferenceClient) {
    this.id = `in-kingdom:${client.modelId}`;
  }

  async infer(request: InferenceRequest): Promise<InferenceResult> {
    const output = await this.client.complete(request);
    return { output, model: this.client.modelId };
  }
}

/**
 * Throws {@link ExternalAdapterNotAllowedError} unless the adapter is safe for
 * client evidence (i.e. not an external/out-of-Kingdom API). Fails closed: an
 * `external` adapter is never a usable path for evidence.
 */
export function assertEvidenceSafeAdapter(adapter: ModelAdapter): void {
  if (adapter.location === "external") {
    throw new ExternalAdapterNotAllowedError(
      `Adapter '${adapter.id}' sends data to an external API; external frontier ` +
        "APIs are not a permitted path for client evidence.",
    );
  }
}

/**
 * Config for selecting the model adapter. Drivers are deliberately limited to
 * the local stub and the in-Kingdom adapter — there is NO external-API driver,
 * so an out-of-Kingdom frontier API is not a selectable path by default.
 */
export type ModelAdapterDriver = "local-stub" | "in-kingdom";

export interface ModelAdapterConfig {
  readonly driver: ModelAdapterDriver;
  /** Required for the "in-kingdom" driver: the injected model transport. */
  readonly client?: InferenceClient;
}

/** Builds the configured model adapter (swappable by config, no hardcoded vendor). */
export function createModelAdapter(config: ModelAdapterConfig): ModelAdapter {
  switch (config.driver) {
    case "local-stub":
      return new LocalStubModelAdapter();
    case "in-kingdom":
      if (!config.client) {
        throw new AiConfigError(
          "The 'in-kingdom' adapter requires an injected inference client.",
        );
      }
      return new InKingdomModelAdapter(config.client);
    default:
      throw new AiConfigError(
        `Unknown AI adapter driver '${String((config as ModelAdapterConfig).driver)}'.`,
      );
  }
}

/**
 * Builds the model adapter from environment configuration:
 * - AI_ADAPTER = "local-stub" (default) | "in-kingdom"
 *
 * The "in-kingdom" driver needs an injected client (a network transport cannot
 * come from an env var alone), so it is supplied via `deps`. There is no env
 * value that selects an external API.
 */
export function createModelAdapterFromEnv(
  deps: { readonly client?: InferenceClient } = {},
  env: NodeJS.ProcessEnv = process.env,
): ModelAdapter {
  const driver: ModelAdapterDriver =
    env.AI_ADAPTER === "in-kingdom" ? "in-kingdom" : "local-stub";
  if (driver === "in-kingdom") {
    return createModelAdapter(
      deps.client ? { driver, client: deps.client } : { driver },
    );
  }
  return createModelAdapter({ driver: "local-stub" });
}
