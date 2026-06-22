import type { AuthSession } from "@eqa/auth";
import type { Locale } from "@eqa/content";
import type {
  AssessmentResponse,
  DashboardInput,
  DashboardRole,
  RemediationItem,
} from "@eqa/workflows";
import type { Database } from "../database";
import { assertUiSession, uiRepositories } from "./assert-session";
import { createDashboardLoader } from "./dashboard-loader";

export interface StandardsWorkspaceLoadResult {
  readonly userId: string;
  readonly dashboardInput: DashboardInput;
  readonly responses: readonly AssessmentResponse[];
  readonly remediationItems: readonly RemediationItem[];
  readonly questionIdsByStandard: ReadonlyMap<string, readonly string[]>;
}

export interface StandardsWorkspaceLoader {
  load(
    session: AuthSession | null | undefined,
    locale: Locale,
    role: DashboardRole,
  ): Promise<StandardsWorkspaceLoadResult>;
}

function buildQuestionIdsByStandard(
  input: DashboardInput,
): ReadonlyMap<string, readonly string[]> {
  const map = new Map<string, string[]>();
  for (const domain of input.questionnaire.domains) {
    for (const principle of domain.principles) {
      for (const standard of principle.standards) {
        map.set(
          standard.number,
          standard.questions.map((q) => q.questionId),
        );
      }
    }
  }
  return map;
}

export function createStandardsWorkspaceLoader(
  db: Database,
): StandardsWorkspaceLoader {
  const dashboardLoader = createDashboardLoader(db);

  return {
    async load(session, locale, role) {
      const authSession = assertUiSession(session);
      const repos = uiRepositories(db, authSession);
      const dashboardInput = await dashboardLoader.loadInput(
        authSession,
        locale,
        role,
      );

      const [responses, remediationItems] = await Promise.all([
        repos.responses.getForAssessment(dashboardInput.assessmentId),
        repos.remediation.listForAssessment(dashboardInput.assessmentId),
      ]);

      return {
        userId: authSession.userId,
        dashboardInput,
        responses,
        remediationItems,
        questionIdsByStandard: buildQuestionIdsByStandard(dashboardInput),
      };
    },
  };
}
