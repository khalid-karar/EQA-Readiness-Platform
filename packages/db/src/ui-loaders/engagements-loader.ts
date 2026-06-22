import type { AuthSession } from "@eqa/auth";
import type { Locale } from "@eqa/content";
import { loadBundledCatalog } from "@eqa/content";
import type { DashboardRole } from "@eqa/workflows";
import { WorkingPaperReviewEngine } from "@eqa/workflows";
import type { AssessmentDisplayName } from "../active-assessment";
import { loadAssessmentContext } from "../active-assessment";
import type { Database } from "../database";
import { assertUiSession, uiRepositories } from "./assert-session";
import { PILOT_PACK_ID, PILOT_PACK_VERSION } from "./pilot-assessment";

export interface EngagementWorkingPaperSummary {
  readonly workingPaperId: string;
  readonly reference: string;
  readonly title: string;
  readonly standardNumbers: readonly string[];
  readonly unreviewedCount: number;
  readonly totalItemCount: number;
}

export interface EngagementOverviewLoad {
  readonly engagementId: string;
  readonly title: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly sampleRationale: string;
  readonly papers: readonly EngagementWorkingPaperSummary[];
}

export interface EngagementsLoadResult {
  readonly assessmentId: string;
  readonly assessmentName: AssessmentDisplayName;
  readonly contentPackId: typeof PILOT_PACK_ID;
  readonly contentVersion: typeof PILOT_PACK_VERSION;
  readonly locale: Locale;
  readonly role: DashboardRole;
  readonly engagements: readonly EngagementOverviewLoad[];
  readonly hasGeneratedEvidencePack: boolean;
}

export interface EngagementsLoader {
  load(
    session: AuthSession | null | undefined,
    locale: Locale,
    role: DashboardRole,
  ): Promise<EngagementsLoadResult>;
}

export function createEngagementsLoader(db: Database): EngagementsLoader {
  return {
    async load(session, locale, role) {
      const repos = uiRepositories(db, assertUiSession(session));
      const { assessmentId, assessmentName } = await loadAssessmentContext(repos);
      const catalog = loadBundledCatalog();
      const wpEngine = new WorkingPaperReviewEngine(
        repos.workingPaperReview,
        catalog,
      );

      const completed =
        await repos.workingPaperReview.listCompletedEngagements();
      const persistedManifest = await repos.evidencePack.getLatest(
        assessmentId,
      );

      const engagements: EngagementOverviewLoad[] = [];

      for (const engagement of completed) {
        const hierarchy = await repos.workingPaperReview.getEngagementHierarchy(
          engagement.engagementId,
        );
        if (!hierarchy) continue;

        const selections =
          await repos.workingPaperReview.getSelectionsForEngagement(
            engagement.engagementId,
          );
        const rationale = selections[0]?.rationale ?? "";

        const papersById = new Map<
          string,
          {
            workingPaperId: string;
            reference: string;
            title: string;
            standardSet: Set<string>;
            unreviewedCount: number;
            totalItemCount: number;
          }
        >();

        for (const fileNode of hierarchy.files) {
          for (const paperNode of fileNode.papers) {
            const paper = paperNode.paper;
            let entry = papersById.get(paper.workingPaperId);
            if (!entry) {
              entry = {
                workingPaperId: paper.workingPaperId,
                reference: paper.reference,
                title: paper.title,
                standardSet: new Set<string>(),
                unreviewedCount: 0,
                totalItemCount: 0,
              };
              papersById.set(paper.workingPaperId, entry);
            }

            for (const checklist of paperNode.checklists) {
              entry.standardSet.add(checklist.standardNumber);
              const review = await wpEngine.getChecklistReview(
                checklist.checklistId,
              );
              for (const item of review.items) {
                entry.totalItemCount += 1;
                if (!item.result) {
                  entry.unreviewedCount += 1;
                }
              }
            }
          }
        }

        const papers = [...papersById.values()]
          .map(({ standardSet, ...paper }) => ({
            ...paper,
            standardNumbers: [...standardSet].sort((a, b) =>
              a.localeCompare(b),
            ),
          }))
          .sort((a, b) => a.reference.localeCompare(b.reference));

        engagements.push({
          engagementId: engagement.engagementId,
          title: engagement.title,
          periodStart: engagement.periodStart,
          periodEnd: engagement.periodEnd,
          sampleRationale: rationale,
          papers,
        });
      }

      return {
        assessmentId,
        assessmentName,
        contentPackId: PILOT_PACK_ID,
        contentVersion: PILOT_PACK_VERSION,
        locale,
        role,
        engagements,
        hasGeneratedEvidencePack: persistedManifest !== null,
      };
    },
  };
}
