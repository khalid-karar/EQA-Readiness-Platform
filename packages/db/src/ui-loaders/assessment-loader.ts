import type { AuthSession } from "@eqa/auth";
import type { Locale } from "@eqa/content";
import { loadBundledCatalog } from "@eqa/content";
import type {
  AssessmentResponse,
  DashboardRole,
  ItemStatus,
} from "@eqa/workflows";
import type { Database } from "../database";
import { assertUiSession, uiRepositories } from "./assert-session";
import {
  PILOT_ASSESSMENT_ID,
  PILOT_ASSESSMENT_NAME,
  PILOT_PACK_ID,
  PILOT_PACK_VERSION,
} from "./pilot-assessment";

export interface AssessmentLoadResult {
  readonly assessmentId: string;
  readonly assessmentName: typeof PILOT_ASSESSMENT_NAME;
  readonly locale: Locale;
  readonly role: DashboardRole;
  readonly contentPackId: string;
  readonly contentPackVersion: string;
  readonly statusesByQuestion: ReadonlyMap<string, ItemStatus>;
  readonly responses: readonly AssessmentResponse[];
}

export interface AssessmentLoader {
  load(
    session: AuthSession | null | undefined,
    locale: Locale,
    role: DashboardRole,
  ): Promise<AssessmentLoadResult>;
}

export function createAssessmentLoader(db: Database): AssessmentLoader {
  return {
    async load(session, locale, role) {
      const repos = uiRepositories(db, assertUiSession(session));
      const catalog = loadBundledCatalog();
      const pack = catalog.get(PILOT_PACK_ID, PILOT_PACK_VERSION);

      const statusRecords = await repos.itemStatus.getForAssessment(
        PILOT_ASSESSMENT_ID,
      );
      const statusesByQuestion = new Map<string, ItemStatus>(
        statusRecords.map((r) => [r.questionId, r.status]),
      );

      return {
        assessmentId: PILOT_ASSESSMENT_ID,
        assessmentName: PILOT_ASSESSMENT_NAME,
        locale,
        role,
        contentPackId: pack.meta.contentPackId,
        contentPackVersion: pack.meta.version,
        statusesByQuestion,
        responses: await repos.responses.getForAssessment(PILOT_ASSESSMENT_ID),
      };
    },
  };
}
