import type { AuthSession } from "@eqa/auth";
import type { Locale } from "@eqa/content";
import { loadBundledCatalog } from "@eqa/content";
import type { DashboardRole, SeeraDemoWorkingPaperItem } from "@eqa/workflows";
import { WorkingPaperReviewEngine } from "@eqa/workflows";
import type { Database } from "../database";
import { assertUiSession, uiRepositories } from "./assert-session";
import { PILOT_ASSESSMENT_NAME } from "./pilot-assessment";

export interface WorkingPapersEngagementLoad {
  readonly engagementId: string;
  readonly titleEn: string;
  readonly titleAr: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly sampleRationaleEn: string;
  readonly sampleRationaleAr: string;
  readonly items: readonly SeeraDemoWorkingPaperItem[];
}

export interface WorkingPapersLoadResult {
  readonly assessmentName: typeof PILOT_ASSESSMENT_NAME;
  readonly locale: Locale;
  readonly role: DashboardRole;
  readonly engagement: WorkingPapersEngagementLoad | null;
}

export interface WorkingPapersLoader {
  load(
    session: AuthSession | null | undefined,
    locale: Locale,
    role: DashboardRole,
  ): Promise<WorkingPapersLoadResult>;
}

export function createWorkingPapersLoader(db: Database): WorkingPapersLoader {
  return {
    async load(session, locale, role) {
      const repos = uiRepositories(db, assertUiSession(session));
      const catalog = loadBundledCatalog();
      const engagements =
        await repos.workingPaperReview.listCompletedEngagements();

      if (engagements.length === 0) {
        return {
          assessmentName: PILOT_ASSESSMENT_NAME,
          locale,
          role,
          engagement: null,
        };
      }

      const engagement = engagements[0]!;
      const hierarchy = await repos.workingPaperReview.getEngagementHierarchy(
        engagement.engagementId,
      );
      if (!hierarchy) {
        return {
          assessmentName: PILOT_ASSESSMENT_NAME,
          locale,
          role,
          engagement: null,
        };
      }

      const selections =
        await repos.workingPaperReview.getSelectionsForEngagement(
          engagement.engagementId,
        );
      const rationale = selections[0]?.rationale ?? "";
      const wpEngine = new WorkingPaperReviewEngine(
        repos.workingPaperReview,
        catalog,
      );

      const items: SeeraDemoWorkingPaperItem[] = [];
      for (const fileNode of hierarchy.files) {
        for (const paperNode of fileNode.papers) {
          const paper = paperNode.paper;
          for (const checklist of paperNode.checklists) {
            const review = await wpEngine.getChecklistReview(
              checklist.checklistId,
            );
            for (const item of review.items) {
              items.push({
                checklistId: checklist.checklistId,
                itemId: item.itemId,
                standardNumber: checklist.standardNumber,
                workingPaperRef: paper.reference,
                workingPaperTitleEn: paper.title,
                workingPaperTitleAr: paper.title,
                conformance: item.result?.conformance ?? null,
                note: item.result?.note ?? null,
                recordedBy: item.result?.recordedBy ?? null,
                recordedAt: item.result?.recordedAt ?? null,
              });
            }
          }
        }
      }

      return {
        assessmentName: PILOT_ASSESSMENT_NAME,
        locale,
        role,
        engagement: {
          engagementId: engagement.engagementId,
          titleEn: engagement.title,
          titleAr: engagement.title,
          periodStart: engagement.periodStart,
          periodEnd: engagement.periodEnd,
          sampleRationaleEn: rationale,
          sampleRationaleAr: rationale,
          items,
        },
      };
    },
  };
}
