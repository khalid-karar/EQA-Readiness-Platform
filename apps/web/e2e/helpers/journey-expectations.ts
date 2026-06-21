import type { Locale } from "@eqa/content";
import { buildDashboardPresentation } from "../../lib/present-dashboard";
import {
  buildJourneyMapPresentation,
  type JourneyCheckpointState,
} from "../../lib/present-journey-map";
import { uiLabel } from "../../lib/ui-labels";

export interface ExpectedCheckpoint {
  readonly id: string;
  readonly href: string;
  readonly state: JourneyCheckpointState;
  readonly percent: number;
  readonly metric: string;
  readonly stateLabel: string;
  readonly label: string;
}

function journeyStateLabelKey(state: JourneyCheckpointState): string {
  switch (state) {
    case "cleared":
      return "journeyStateCleared";
    case "in-progress":
      return "journeyStateInProgress";
    case "not-started":
      return "journeyStateNotStarted";
    case "blocked":
      return "journeyStateBlocked";
  }
}

/** Expected journey checkpoints derived from the same synthetic fixture as the UI. */
export function expectedJourneyCheckpoints(locale: Locale): ExpectedCheckpoint[] {
  const view = buildDashboardPresentation(locale, "cae").view;
  const journeyMap = buildJourneyMapPresentation(view, "cae");
  return journeyMap.checkpoints.map((cp) => ({
    id: cp.id,
    href: cp.href,
    state: cp.state,
    percent: cp.percent,
    metric: locale === "ar" ? cp.metricAr : cp.metricEn,
    stateLabel: uiLabel(journeyStateLabelKey(cp.state), locale),
    label: locale === "ar" ? cp.labelAr : cp.labelEn,
  }));
}

export function journeyQuery(locale: Locale, role = "cae"): string {
  return `?locale=${locale}&role=${role}`;
}
