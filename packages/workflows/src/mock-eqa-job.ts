import type { JobHandler } from "@eqa/jobs";
import type { TenantContext } from "@eqa/tenant";
import { computeMockEqaSimulation } from "./mock-eqa-scoring";
import type { MockEqaScoringInput } from "./mock-eqa-scoring";

/** Job name for the mock-EQA readiness simulation (Step 6.5 background job). */
export const MOCK_EQA_SIMULATION_JOB = "mock-eqa:readiness-simulation";

/**
 * Payload enqueued when CAE or Audit Staff requests a readiness simulation.
 * The handler loads tenant-scoped inputs and persists a simulation result —
 * never a formal assessment conclusion.
 */
export interface MockEqaSimulationPayload {
  readonly assessmentId: string;
  readonly contentPackId: string;
  readonly contentVersion: string;
  readonly engagementId?: string;
  readonly locale?: "en" | "ar";
  readonly requestedBy: string;
}

/** Loads scoring inputs from the tenant data layer for the job handler. */
export interface MockEqaScoringLoader {
  loadScoringInput(
    tenant: TenantContext,
    payload: MockEqaSimulationPayload,
  ): Promise<MockEqaScoringInput>;
}

/** Persists a computed simulation result (tenant-scoped, audited). */
export interface MockEqaSimulationSink {
  persistSimulation(
    tenant: TenantContext,
    result: ReturnType<typeof computeMockEqaSimulation>,
    requestedBy: string,
  ): Promise<ReturnType<typeof computeMockEqaSimulation>>;
}

export interface MockEqaScoringJobDeps {
  readonly loader: MockEqaScoringLoader;
  readonly sink: MockEqaSimulationSink;
}

/**
 * Builds the mock-EQA scoring job handler. Runs inside the Step 6.5 framework's
 * resolved tenant context: loads statuses, human-reviewed findings, and
 * working-paper conformance; computes a {@link READINESS_SIMULATION_KIND}
 * result; persists it through the data-layer sink (audited, tenant-isolated).
 */
export function createMockEqaScoringHandler(
  deps: MockEqaScoringJobDeps,
): JobHandler {
  return async (ctx) => {
    const payload = ctx.payload as MockEqaSimulationPayload;
    const input = await deps.loader.loadScoringInput(ctx.tenant, payload);
    const result = computeMockEqaSimulation({
      ...input,
      runBy: payload.requestedBy,
      locale: payload.locale ?? input.locale,
    });
    await deps.sink.persistSimulation(ctx.tenant, result, payload.requestedBy);
    return {
      simulationId: result.simulationId,
      kind: result.kind,
      overallScore: result.overall.score,
      overallLevel: result.overall.level,
    };
  };
}
