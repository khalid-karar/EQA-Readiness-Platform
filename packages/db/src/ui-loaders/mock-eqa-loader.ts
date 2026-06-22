import type { AuthSession } from "@eqa/auth";
import type { Locale } from "@eqa/content";
import { loadBundledCatalog } from "@eqa/content";
import type {
  DashboardRole,
  MockEqaScoringInput,
  MockEqaSimulationResult,
} from "@eqa/workflows";
import { loadAssessmentContext } from "../active-assessment";
import type { Database } from "../database";
import { assertUiSession, uiRepositories } from "./assert-session";
import { loadMockEqaScoringInput } from "./scoring-input";

export interface MockEqaLoadResult {
  readonly locale: Locale;
  readonly role: DashboardRole;
  readonly scoringInput: MockEqaScoringInput;
  readonly persistedSimulation: MockEqaSimulationResult | null;
}

export interface MockEqaLoader {
  load(
    session: AuthSession | null | undefined,
    locale: Locale,
    role: DashboardRole,
  ): Promise<MockEqaLoadResult>;
}

export function createMockEqaLoader(db: Database): MockEqaLoader {
  return {
    async load(session, locale, role) {
      const repos = uiRepositories(db, assertUiSession(session));
      const { assessmentId } = await loadAssessmentContext(repos);
      const catalog = loadBundledCatalog();
      const scoringInput = await loadMockEqaScoringInput(repos, locale, catalog);
      const persistedSimulation = await repos.mockEqa.getLatest(
        assessmentId,
      );
      return {
        locale,
        role,
        scoringInput,
        persistedSimulation,
      };
    },
  };
}
