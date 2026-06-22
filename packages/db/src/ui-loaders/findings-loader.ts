import type { AuthSession } from "@eqa/auth";
import type { Locale } from "@eqa/content";
import type { DashboardRole, DraftFinding, FinalConclusion } from "@eqa/workflows";
import type { AssessmentDisplayName } from "../active-assessment";
import { loadAssessmentContext } from "../active-assessment";
import type { Database } from "../database";
import { assertUiSession, uiRepositories } from "./assert-session";

export interface FindingsLoadResult {
  readonly assessmentId: string;
  readonly assessmentName: AssessmentDisplayName;
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
      const { assessmentId, assessmentName } = await loadAssessmentContext(repos);
      return {
        assessmentId,
        assessmentName,
        locale,
        role,
        drafts: await repos.draftFindings.getForAssessment(assessmentId),
        conclusions: await repos.humanReview.getForAssessment(assessmentId),
      };
    },
  };
}
