import {
  createSeeraDemoAssessmentName,
  SEERA_DEMO_ASSESSMENT_ID,
  SEERA_DEMO_PACK_ID,
  SEERA_DEMO_PACK_VERSION,
} from "@eqa/workflows";

/** Pilot assessment identifiers — matches the synthetic Seera seed. */
export const PILOT_ASSESSMENT_ID = SEERA_DEMO_ASSESSMENT_ID;
export const PILOT_PACK_ID = SEERA_DEMO_PACK_ID;
export const PILOT_PACK_VERSION = SEERA_DEMO_PACK_VERSION;
export const PILOT_ASSESSMENT_NAME = createSeeraDemoAssessmentName();
