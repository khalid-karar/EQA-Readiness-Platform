import type { ContentCatalog, ContentPin } from "@eqa/content";
import { loadBundledCatalog } from "@eqa/content";
import type { TenantRepositories } from "./repositories";
import {
  assessmentNameKey,
  EMPTY_DEMO_ASSESSMENT_ID,
  EMPTY_DEMO_ASSESSMENT_NAME,
} from "./seed-empty-assessment";
import {
  PILOT_ASSESSMENT_ID,
  PILOT_ASSESSMENT_NAME,
  PILOT_PACK_ID,
  PILOT_PACK_VERSION,
} from "./ui-loaders/pilot-assessment";

/** Tenant KV pointer — which assessment id loaders and writes use for this tenant. */
export const ACTIVE_ASSESSMENT_KV_KEY = "tenant.activeAssessmentId";

export type AssessmentDisplayName = {
  readonly en: string;
  readonly ar: string;
};

type KvReader = Pick<TenantRepositories["kv"], "get">;
type KvWriter = Pick<TenantRepositories["kv"], "set">;

/** Reads the tenant's active assessment id; defaults to the Seera pilot id when unset. */
export async function resolveActiveAssessmentId(
  kv: KvReader,
): Promise<string> {
  const stored = await kv.get(ACTIVE_ASSESSMENT_KV_KEY);
  return stored ?? PILOT_ASSESSMENT_ID;
}

/** Resolves localized assessment title from tenant KV (or Seera defaults). */
export async function resolveAssessmentName(
  kv: KvReader,
  assessmentId: string,
): Promise<AssessmentDisplayName> {
  if (assessmentId === PILOT_ASSESSMENT_ID) {
    return PILOT_ASSESSMENT_NAME;
  }
  const [en, ar] = await Promise.all([
    kv.get(assessmentNameKey(assessmentId, "en")),
    kv.get(assessmentNameKey(assessmentId, "ar")),
  ]);
  if (en && ar) {
    return { en, ar };
  }
  if (assessmentId === EMPTY_DEMO_ASSESSMENT_ID) {
    return EMPTY_DEMO_ASSESSMENT_NAME;
  }
  return PILOT_ASSESSMENT_NAME;
}

/** Idempotent seed helper — pins the tenant's active assessment pointer. */
export async function setActiveAssessmentPointer(
  kv: KvWriter,
  assessmentId: string,
): Promise<void> {
  await kv.set(ACTIVE_ASSESSMENT_KV_KEY, assessmentId);
}

export async function loadAssessmentContext(
  repos: Pick<TenantRepositories, "kv">,
): Promise<{
  readonly assessmentId: string;
  readonly assessmentName: AssessmentDisplayName;
}> {
  const assessmentId = await resolveActiveAssessmentId(repos.kv);
  const assessmentName = await resolveAssessmentName(repos.kv, assessmentId);
  return { assessmentId, assessmentName };
}

/** Content pin for the tenant's active assessment (same bundled pack version). */
export function pinForActiveAssessment(
  catalog: ContentCatalog,
  assessmentId: string,
): ContentPin {
  return catalog.pinForAssessment(
    assessmentId,
    PILOT_PACK_ID,
    PILOT_PACK_VERSION,
  );
}

export async function resolveActiveAssessmentPin(
  kv: KvReader,
  catalog: ContentCatalog = loadBundledCatalog(),
): Promise<ContentPin> {
  const assessmentId = await resolveActiveAssessmentId(kv);
  return pinForActiveAssessment(catalog, assessmentId);
}

export async function resolvePilotReportIds(
  kv: KvReader,
  body: Record<string, unknown>,
): Promise<{
  assessmentId: string;
  contentPackId: string;
  contentVersion: string;
  locale?: "en" | "ar";
}> {
  const localeRaw = body.locale;
  const locale =
    localeRaw === "en" || localeRaw === "ar" ? localeRaw : undefined;
  const assessmentId =
    body.assessmentId != null
      ? String(body.assessmentId)
      : await resolveActiveAssessmentId(kv);
  return {
    assessmentId,
    contentPackId: String(body.contentPackId ?? PILOT_PACK_ID),
    contentVersion: String(body.contentVersion ?? PILOT_PACK_VERSION),
    ...(locale ? { locale } : {}),
  };
}
