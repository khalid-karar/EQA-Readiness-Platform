import type { AuthSession } from "@eqa/auth";
import type { Locale } from "@eqa/content";
import type { DashboardRole, DraftFinding, FinalConclusion } from "@eqa/workflows";
import type { Database } from "../database";
import { assertUiSession, uiRepositories } from "./assert-session";
import { PILOT_ASSESSMENT_ID, PILOT_ASSESSMENT_NAME } from "./pilot-assessment";

export interface FindingsLoadResult {
  readonly assessmentId: string;
  readonly assessmentName: typeof PILOT_ASSESSMENT_NAME;
  readonly locale: Locale;
  readonly role: DashboardRole;
  readonly drafts: readonly DraftFinding[];
  readonly conclusions: readonly FinalConclusion[];
}

export interface FindingsLoader {
  load(
    session: AuthSession | null | undefined,
    locale: Locale,
    role: DashboardRole,
  ): Promise<FindingsLoadResult>;
}

export function createFindingsLoader(db: Database): FindingsLoader {
  return {
    async load(session, locale, role) {
      const repos = uiRepositories(db, assertUiSession(session));
      return {
        assessmentId: PILOT_ASSESSMENT_ID,
        assessmentName: PILOT_ASSESSMENT_NAME,
        locale,
        role,
        drafts: await repos.draftFindings.getForAssessment(PILOT_ASSESSMENT_ID),
        conclusions: await repos.humanReview.getForAssessment(
          PILOT_ASSESSMENT_ID,
        ),
      };
    },
  };
}
