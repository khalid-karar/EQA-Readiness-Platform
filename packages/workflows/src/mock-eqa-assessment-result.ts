import { NotFormalAssessmentResultError } from "./errors";
import {
  FORMAL_ASSESSMENT_RESULT_KIND,
  isFormalAssessmentResult,
  isReadinessSimulation,
  READINESS_SIMULATION_KIND,
  type FormalAssessmentResult,
  type MockEqaSimulationResult,
} from "./mock-eqa-scoring";

/**
 * Narrows `value` to {@link MockEqaSimulationResult} or throws. Downstream code
 * that consumes mock-EQA output uses this guard so only simulations are accepted
 * on the simulation path.
 */
export function assertReadinessSimulation(
  value: unknown,
): asserts value is MockEqaSimulationResult {
  if (!isReadinessSimulation(value)) {
    throw new NotFormalAssessmentResultError(
      `Expected kind '${READINESS_SIMULATION_KIND}' for a readiness simulation; ` +
        `got '${(value as { kind?: unknown })?.kind ?? typeof value}'.`,
    );
  }
}

/**
 * Narrows `value` to {@link FormalAssessmentResult} or throws. A mock-EQA
 * simulation ({@link READINESS_SIMULATION_KIND}) is rejected here — it can never
 * be treated as or promoted to an official external-assessor conclusion.
 */
export function assertFormalAssessmentResult(
  value: unknown,
): asserts value is FormalAssessmentResult {
  if (!isFormalAssessmentResult(value)) {
    const kind = (value as { kind?: unknown })?.kind;
    if (kind === READINESS_SIMULATION_KIND) {
      throw new NotFormalAssessmentResultError(
        "Refusing to treat a readiness simulation as a formal assessment " +
          "conclusion. Mock-EQA output supports preparation only and cannot be " +
          "promoted to an official external-assessor result.",
      );
    }
    throw new NotFormalAssessmentResultError(
      `Expected kind '${FORMAL_ASSESSMENT_RESULT_KIND}' for a formal assessment ` +
        `result; got '${kind ?? typeof value}'.`,
    );
  }
}
