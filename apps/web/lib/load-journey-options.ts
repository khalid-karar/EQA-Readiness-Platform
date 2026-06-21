import type { AuthSession } from "@eqa/auth";
import type { Locale } from "@eqa/content";
import type { DashboardRole } from "@eqa/workflows";
import {
  buildEvidencePackPresentation,
  buildEvidencePackPresentationFromLoad,
} from "./present-evidence-pack";
import {
  buildMockEqaPresentation,
  buildMockEqaPresentationFromLoad,
} from "./present-mock-eqa";
import type { JourneyMapOptions } from "./present-journey-map";
import {
  loadEvidencePackData,
  loadMockEqaData,
  loadRemediationTrackerView,
} from "./load-screen-data";

/** Loads journey-map checkpoint data from tenant repos (or demo fixtures). */
export async function loadJourneyMapOptions(
  session: AuthSession,
  locale: Locale,
  role: DashboardRole,
): Promise<JourneyMapOptions> {
  const remediationView = await loadRemediationTrackerView(session, locale, role);
  const mockEqa = await loadMockEqaData(session, locale, role);
  const evidencePack = await loadEvidencePackData(session, locale, role);

  return {
    ...(remediationView !== "demo" ? { remediationView } : {}),
    ...(mockEqa !== "demo"
      ? {
          mockEqaPresentation: buildMockEqaPresentationFromLoad(mockEqa),
          mockEqaStarted: mockEqa.persistedSimulation !== null,
        }
      : {}),
    ...(evidencePack !== "demo"
      ? {
          evidencePackPresentation:
            buildEvidencePackPresentationFromLoad(evidencePack),
          evidencePackStarted: evidencePack.persistedManifest !== null,
        }
      : {}),
  };
}

export async function loadJourneyMapOptionsOrDemo(
  session: AuthSession,
  locale: Locale,
  role: DashboardRole,
): Promise<JourneyMapOptions> {
  const options = await loadJourneyMapOptions(session, locale, role);
  if (!options.mockEqaPresentation) {
    return {
      ...options,
      mockEqaPresentation: buildMockEqaPresentation(locale, role),
    };
  }
  if (!options.evidencePackPresentation) {
    return {
      ...options,
      evidencePackPresentation: buildEvidencePackPresentation(locale, role),
    };
  }
  return options;
}
