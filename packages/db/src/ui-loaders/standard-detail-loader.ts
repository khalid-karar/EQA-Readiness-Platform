import type { AuditEntry } from "@eqa/audit-log";
import type { AuthSession } from "@eqa/auth";
import type { Locale } from "@eqa/content";
import { loadBundledCatalog } from "@eqa/content";
import {
  INITIAL_ITEM_STATUS,
  renderQuestionnaire,
  WorkingPaperReviewEngine,
  type DashboardRole,
  type DraftFinding,
  type EvidenceMetadataForPack,
  type FinalConclusion,
  type ItemStatus,
} from "@eqa/workflows";
import type { Database } from "../database";
import { assertUiSession, uiRepositories } from "./assert-session";
import {
  PILOT_ASSESSMENT_ID,
  PILOT_ASSESSMENT_NAME,
  PILOT_PACK_ID,
  PILOT_PACK_VERSION,
} from "./pilot-assessment";

export interface StandardRequirementLoad {
  readonly questionId: string;
  readonly questionTextEn: string;
  readonly questionTextAr: string;
  readonly status: ItemStatus;
  readonly answer: string | null;
  readonly note: string | null;
  readonly respondedAt: string | null;
  readonly draftFinding: DraftFinding | null;
  readonly finalConclusion: FinalConclusion | null;
  readonly evidence: readonly EvidenceMetadataForPack[];
}

export interface StandardWpConformanceLoad {
  readonly checklistId: string;
  readonly itemId: string;
  readonly itemTextEn: string;
  readonly itemTextAr: string;
  readonly workingPaperRef: string;
  readonly workingPaperTitle: string;
  readonly conformance: "conforms" | "does_not_conform" | "not_applicable" | null;
  readonly note: string | null;
  readonly recordedBy: string | null;
  readonly recordedAt: string | null;
}

export interface StandardDetailLoadResult {
  readonly assessmentId: string;
  readonly assessmentName: typeof PILOT_ASSESSMENT_NAME;
  readonly locale: Locale;
  readonly role: DashboardRole;
  readonly standardNumber: string;
  readonly standardTitleEn: string;
  readonly standardTitleAr: string;
  readonly domainNumber: string;
  readonly domainTitleEn: string;
  readonly domainTitleAr: string;
  readonly principleNumber: string;
  readonly principleTitleEn: string;
  readonly principleTitleAr: string;
  readonly contentPackId: string;
  readonly contentPackVersion: string;
  readonly contentHash: string;
  readonly requirements: readonly StandardRequirementLoad[];
  readonly wpConformance: readonly StandardWpConformanceLoad[];
  readonly decisionTrail: readonly AuditEntry[];
}

export interface StandardDetailLoader {
  load(
    session: AuthSession | null | undefined,
    locale: Locale,
    role: DashboardRole,
    standardNumber: string,
  ): Promise<StandardDetailLoadResult | null>;
}

function evidenceLinksRequirement(
  links: readonly string[],
  standardNumber: string,
  questionId: string,
): boolean {
  return links.includes(standardNumber) || links.includes(questionId);
}

function auditRelatesToStandard(
  entry: AuditEntry,
  assessmentId: string,
  questionIds: ReadonlySet<string>,
  standardNumber: string,
): boolean {
  if (entry.entity === "assessment_item_status") {
    const [, questionId] = entry.entityId.split("::");
    return questionIds.has(questionId ?? "");
  }
  if (entry.entity === "assessment_response") {
    const [, questionId] = entry.entityId.split("::");
    return questionIds.has(questionId ?? "");
  }
  if (entry.entity === "draft_finding") {
    try {
      const value = entry.newValue ? JSON.parse(entry.newValue) : null;
      if (value?.questionId && questionIds.has(String(value.questionId))) {
        return true;
      }
      if (value?.standardNumber === standardNumber) return true;
    } catch {
      return false;
    }
  }
  if (entry.entity === "human_review_decision") {
    try {
      const value = entry.newValue ? JSON.parse(entry.newValue) : null;
      if (value?.questionId && questionIds.has(String(value.questionId))) {
        return true;
      }
    } catch {
      return false;
    }
  }
  if (entry.entityId.startsWith(`${assessmentId}::`)) {
    const [, questionId] = entry.entityId.split("::");
    return questionIds.has(questionId ?? "");
  }
  return false;
}

export function createStandardDetailLoader(db: Database): StandardDetailLoader {
  return {
    async load(session, locale, role, standardNumber) {
      const repos = uiRepositories(db, assertUiSession(session));
      const catalog = loadBundledCatalog();
      const pack = catalog.get(PILOT_PACK_ID, PILOT_PACK_VERSION);
      const questionnaireEn = renderQuestionnaire(pack, "en");
      const questionnaireAr = renderQuestionnaire(pack, "ar");

      let matched:
        | {
            domainNumber: string;
            domainTitleEn: string;
            domainTitleAr: string;
            principleNumber: string;
            principleTitleEn: string;
            principleTitleAr: string;
            standardTitleEn: string;
            standardTitleAr: string;
            questionIds: string[];
          }
        | undefined;

      for (const domain of questionnaireEn.domains) {
        const domainAr = questionnaireAr.domains.find((d) => d.id === domain.id);
        for (const principle of domain.principles) {
          const principleAr = domainAr?.principles.find(
            (p) => p.id === principle.id,
          );
          for (const standard of principle.standards) {
            if (standard.number !== standardNumber) continue;
            const standardAr = principleAr?.standards.find(
              (s) => s.number === standard.number,
            );
            matched = {
              domainNumber: domain.number,
              domainTitleEn: domain.title,
              domainTitleAr: domainAr?.title ?? domain.title,
              principleNumber: principle.number,
              principleTitleEn: principle.title,
              principleTitleAr: principleAr?.title ?? principle.title,
              standardTitleEn: standard.title,
              standardTitleAr: standardAr?.title ?? standard.title,
              questionIds: standard.questions.map((q) => q.questionId),
            };
            break;
          }
        }
      }

      if (!matched) {
        return null;
      }

      const [
        statusRecords,
        responses,
        drafts,
        conclusions,
        evidenceRows,
        auditEntries,
        engagements,
      ] = await Promise.all([
        repos.itemStatus.getForAssessment(PILOT_ASSESSMENT_ID),
        repos.responses.getForAssessment(PILOT_ASSESSMENT_ID),
        repos.draftFindings.getForAssessment(PILOT_ASSESSMENT_ID),
        repos.humanReview.getForAssessment(PILOT_ASSESSMENT_ID),
        repos.evidence.list(),
        repos.audit.list(),
        repos.workingPaperReview.listCompletedEngagements(),
      ]);

      const statusesByQuestion = new Map(
        statusRecords.map((r) => [r.questionId, r.status]),
      );
      const responsesByQuestion = new Map(
        responses.map((r) => [r.questionId, r]),
      );
      const draftsByQuestion = new Map(
        drafts.map((d) => [d.questionId, d]),
      );
      const conclusionsByQuestion = new Map(
        conclusions.map((c) => [c.questionId, c]),
      );
      const evidenceForPack = evidenceRows.map((meta) => ({
        evidenceId: meta.evidenceId,
        version: meta.version,
        fileName: meta.fileName,
        contentType: meta.contentType,
        sizeBytes: meta.sizeBytes,
        links: meta.links,
        scanStatus: meta.scanStatus,
        uploadedAt: meta.uploadedAt,
      }));

      const requirements: StandardRequirementLoad[] = matched.questionIds.map(
        (questionId) => {
          const qEn = questionnaireEn.domains
            .flatMap((d) => d.principles)
            .flatMap((p) => p.standards)
            .flatMap((s) => s.questions)
            .find((q) => q.questionId === questionId);
          const qAr = questionnaireAr.domains
            .flatMap((d) => d.principles)
            .flatMap((p) => p.standards)
            .flatMap((s) => s.questions)
            .find((q) => q.questionId === questionId);
          const response = responsesByQuestion.get(questionId);
          return {
            questionId,
            questionTextEn: qEn?.text ?? questionId,
            questionTextAr: qAr?.text ?? questionId,
            status: statusesByQuestion.get(questionId) ?? INITIAL_ITEM_STATUS,
            answer: response?.answer ?? null,
            note: response?.note ?? null,
            respondedAt: response?.respondedAt ?? null,
            draftFinding: draftsByQuestion.get(questionId) ?? null,
            finalConclusion: conclusionsByQuestion.get(questionId) ?? null,
            evidence: evidenceForPack.filter((item) =>
              evidenceLinksRequirement(
                item.links,
                standardNumber,
                questionId,
              ),
            ),
          };
        },
      );

      const wpConformance: StandardWpConformanceLoad[] = [];
      if (engagements.length > 0) {
        const engagementId = engagements[0]!.engagementId;
        const hierarchy =
          await repos.workingPaperReview.getEngagementHierarchy(engagementId);
        const wpEngine = new WorkingPaperReviewEngine(
          repos.workingPaperReview,
          catalog,
        );
        if (hierarchy) {
          for (const fileNode of hierarchy.files) {
            for (const paperNode of fileNode.papers) {
              for (const checklist of paperNode.checklists) {
                if (checklist.standardNumber !== standardNumber) continue;
                const review = await wpEngine.getChecklistReview(
                  checklist.checklistId,
                );
                for (const item of review.items) {
                  wpConformance.push({
                    checklistId: checklist.checklistId,
                    itemId: item.itemId,
                    itemTextEn: item.text.en,
                    itemTextAr: item.text.ar,
                    workingPaperRef: paperNode.paper.reference,
                    workingPaperTitle: paperNode.paper.title,
                    conformance: item.result?.conformance ?? null,
                    note: item.result?.note ?? null,
                    recordedBy: item.result?.recordedBy ?? null,
                    recordedAt: item.result?.recordedAt ?? null,
                  });
                }
              }
            }
          }
        }
      }

      const questionIdSet = new Set(matched.questionIds);
      const decisionTrail = auditEntries
        .filter((entry) =>
          auditRelatesToStandard(
            entry,
            PILOT_ASSESSMENT_ID,
            questionIdSet,
            standardNumber,
          ),
        )
        .sort((a, b) => a.seq - b.seq);

      return {
        assessmentId: PILOT_ASSESSMENT_ID,
        assessmentName: PILOT_ASSESSMENT_NAME,
        locale,
        role,
        standardNumber,
        standardTitleEn: matched.standardTitleEn,
        standardTitleAr: matched.standardTitleAr,
        domainNumber: matched.domainNumber,
        domainTitleEn: matched.domainTitleEn,
        domainTitleAr: matched.domainTitleAr,
        principleNumber: matched.principleNumber,
        principleTitleEn: matched.principleTitleEn,
        principleTitleAr: matched.principleTitleAr,
        contentPackId: pack.meta.contentPackId,
        contentPackVersion: pack.meta.version,
        contentHash: pack.contentHash,
        requirements,
        wpConformance,
        decisionTrail,
      };
    },
  };
}
