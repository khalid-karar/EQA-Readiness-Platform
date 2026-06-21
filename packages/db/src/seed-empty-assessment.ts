/**
 * Seeds a blank synthetic assessment: content-pinned to the bundled pack version
 * but with no responses, evidence, findings, or item-status rows (rule 5).
 */
import { loadBundledCatalog, type ContentPin } from "@eqa/content";
import type { TenantDescriptor } from "@eqa/tenant";
import { SEERA_DEMO_PACK_ID, SEERA_DEMO_PACK_VERSION } from "@eqa/workflows";
import type { Database } from "./database";
import { createTenantRepositories } from "./repositories";
import { contextOf, sessionFor } from "./testing/fixtures";

/** Synthetic assessment id for a cold-start demo walk (no pre-filled answers). */
export const EMPTY_DEMO_ASSESSMENT_ID = "assessment-empty-2026";

export const EMPTY_DEMO_ASSESSMENT_NAME = {
  en: "Fresh EQA Foundations Assessment 2026",
  ar: "تقييم أسس EQA جديد 2026",
} as const;

function seedMarkerFor(assessmentId: string): string {
  return `empty-assessment-seed-v1:${assessmentId}`;
}

/** Tenant KV key holding the immutable content pin for an assessment. */
export function assessmentContentPinKey(assessmentId: string): string {
  return `assessment.${assessmentId}.contentPin`;
}

export function assessmentNameKey(
  assessmentId: string,
  locale: "en" | "ar",
): string {
  return `assessment.${assessmentId}.name.${locale}`;
}

async function readStoredContentPin(
  kv: { get(key: string): Promise<string | null> },
  assessmentId: string,
): Promise<ContentPin> {
  const raw = await kv.get(assessmentContentPinKey(assessmentId));
  if (!raw) {
    throw new Error(
      `No content pin registered for assessment '${assessmentId}'.`,
    );
  }
  return JSON.parse(raw) as ContentPin;
}

/**
 * Idempotently registers a fresh assessment pinned to the current bundled
 * content version. Writes only tenant KV metadata — no workflow rows.
 */
export async function seedEmptyAssessment(
  db: Database,
  tenant: TenantDescriptor,
  assessmentId: string = EMPTY_DEMO_ASSESSMENT_ID,
): Promise<ContentPin> {
  const cae = createTenantRepositories(db, sessionFor(contextOf(tenant), "cae"));
  if ((await cae.kv.get(seedMarkerFor(assessmentId))) === "done") {
    return readStoredContentPin(cae.kv, assessmentId);
  }

  const catalog = loadBundledCatalog();
  const pin = catalog.pinForAssessment(
    assessmentId,
    SEERA_DEMO_PACK_ID,
    SEERA_DEMO_PACK_VERSION,
  );

  await cae.kv.set(assessmentContentPinKey(assessmentId), JSON.stringify(pin));
  await cae.kv.set(
    assessmentNameKey(assessmentId, "en"),
    EMPTY_DEMO_ASSESSMENT_NAME.en,
  );
  await cae.kv.set(
    assessmentNameKey(assessmentId, "ar"),
    EMPTY_DEMO_ASSESSMENT_NAME.ar,
  );
  await cae.kv.set(seedMarkerFor(assessmentId), "done");

  return pin;
}
