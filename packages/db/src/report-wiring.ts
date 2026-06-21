import type { JobHandlerMap } from "@eqa/jobs";
import type { ObjectStore } from "@eqa/storage";
import {
  createEvidencePackHandler,
  createMockEqaScoringHandler,
  defaultEvidencePackRenderer,
  EVIDENCE_PACK_EXPORT_JOB,
  MOCK_EQA_SIMULATION_JOB,
} from "@eqa/workflows";
import type { Database } from "./database";
import {
  createEvidencePackLoader,
  createEvidencePackSink,
} from "./evidence-pack-system";
import {
  createMockEqaScoringLoader,
  createMockEqaSimulationSink,
} from "./mock-eqa-system";

/** Job handlers for mock-EQA simulation and evidence pack export (Step 6.5). */
export function createReportJobHandlers(
  db: Database,
  objectStore: ObjectStore,
): JobHandlerMap {
  return {
    [MOCK_EQA_SIMULATION_JOB]: createMockEqaScoringHandler({
      loader: createMockEqaScoringLoader(db),
      sink: createMockEqaSimulationSink(db),
    }),
    [EVIDENCE_PACK_EXPORT_JOB]: createEvidencePackHandler({
      loader: createEvidencePackLoader(db),
      renderer: defaultEvidencePackRenderer,
      sink: createEvidencePackSink(db, objectStore),
    }),
  };
}
