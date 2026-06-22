import type { AuthSession } from "@eqa/auth";
import type { Locale } from "@eqa/content";
import type { DashboardRole, EvidenceMetadataForPack } from "@eqa/workflows";
import type { AssessmentDisplayName } from "../active-assessment";
import { loadAssessmentContext } from "../active-assessment";
import type { Database } from "../database";
import { assertUiSession, uiRepositories } from "./assert-session";

export interface EvidenceLoadResult {
  readonly assessmentName: AssessmentDisplayName;
  readonly locale: Locale;
  readonly role: DashboardRole;
  readonly items: readonly EvidenceMetadataForPack[];
}

export interface EvidenceLoader {
  load(
    session: AuthSession | null | undefined,
    locale: Locale,
    role: DashboardRole,
  ): Promise<EvidenceLoadResult>;
}

function toPackMetadata(
  meta: Awaited<
    ReturnType<
      ReturnType<typeof uiRepositories>["evidence"]["list"]
    >
  >[number],
): EvidenceMetadataForPack {
  return {
    evidenceId: meta.evidenceId,
    version: meta.version,
    fileName: meta.fileName,
    contentType: meta.contentType,
    sizeBytes: meta.sizeBytes,
    links: meta.links,
    scanStatus: meta.scanStatus,
    uploadedAt: meta.uploadedAt,
  };
}

export function createEvidenceLoader(db: Database): EvidenceLoader {
  return {
    async load(session, locale, role) {
      const repos = uiRepositories(db, assertUiSession(session));
      const { assessmentName } = await loadAssessmentContext(repos);
      const rows = await repos.evidence.list();
      return {
        assessmentName,
        locale,
        role,
        items: rows.map(toPackMetadata),
      };
    },
  };
}
