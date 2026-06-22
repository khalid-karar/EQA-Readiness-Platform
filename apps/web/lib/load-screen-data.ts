import type { AuthSession } from "@eqa/auth";
import type { Locale } from "@eqa/content";
import {
  createAssessmentLoader,
  createDashboardLoader,
  createEvidenceLoader,
  createEvidencePackLoader,
  createFindingsLoader,
  createMockEqaLoader,
  createRemediationLoader,
  createStandardDetailLoader,
  type RemediationWorkspaceLoadResult,
  createWorkingPapersLoader,
  createStandardsWorkspaceLoader,
  type AssessmentLoadResult,
  type StandardsWorkspaceLoadResult,
  type EvidenceLoadResult,
  type EvidencePackLoadResult,
  type FindingsLoadResult,
  type MockEqaLoadResult,
  type StandardDetailLoadResult,
  type WorkingPapersLoadResult,
} from "@eqa/db";
import type { DashboardInput, DashboardRole, RemediationTrackerView } from "@eqa/workflows";
import { isDemoFixturesEnabled } from "./demo-fixtures";
import { getAppDatabase, isDatabaseConfigured } from "./db";

function useDatabaseReads(): boolean {
  return isDatabaseConfigured() && !isDemoFixturesEnabled();
}

export async function loadDashboardInput(
  session: AuthSession,
  locale: Locale,
  role: DashboardRole,
): Promise<DashboardInput> {
  if (!useDatabaseReads()) {
    const { createSyntheticDashboardInput } = await import("@eqa/workflows");
    return createSyntheticDashboardInput(locale, role);
  }
  return createDashboardLoader(getAppDatabase()).loadInput(session, locale, role);
}

export async function loadAssessmentData(
  session: AuthSession,
  locale: Locale,
  role: DashboardRole,
): Promise<AssessmentLoadResult | "demo"> {
  if (!useDatabaseReads()) {
    return "demo";
  }
  return createAssessmentLoader(getAppDatabase()).load(session, locale, role);
}

export async function loadFindingsData(
  session: AuthSession,
  locale: Locale,
  role: DashboardRole,
): Promise<FindingsLoadResult | "demo"> {
  if (!useDatabaseReads()) {
    return "demo";
  }
  return createFindingsLoader(getAppDatabase()).load(session, locale, role);
}

export async function loadEvidenceData(
  session: AuthSession,
  locale: Locale,
  role: DashboardRole,
): Promise<EvidenceLoadResult | "demo"> {
  if (!useDatabaseReads()) {
    return "demo";
  }
  return createEvidenceLoader(getAppDatabase()).load(session, locale, role);
}

export async function loadRemediationTrackerView(
  session: AuthSession,
  locale: Locale,
  role: DashboardRole,
): Promise<RemediationTrackerView | "demo"> {
  if (!useDatabaseReads()) {
    return "demo";
  }
  return createRemediationLoader(getAppDatabase()).loadTrackerView(
    session,
    locale,
    role,
  );
}

export async function loadRemediationWorkspaceData(
  session: AuthSession,
  locale: Locale,
  role: DashboardRole,
): Promise<RemediationWorkspaceLoadResult | "demo"> {
  if (!useDatabaseReads()) {
    return "demo";
  }
  return createRemediationLoader(getAppDatabase()).loadWorkspace(
    session,
    locale,
    role,
  );
}

export async function loadWorkingPapersData(
  session: AuthSession,
  locale: Locale,
  role: DashboardRole,
): Promise<WorkingPapersLoadResult | "demo"> {
  if (!useDatabaseReads()) {
    return "demo";
  }
  return createWorkingPapersLoader(getAppDatabase()).load(session, locale, role);
}

export async function loadMockEqaData(
  session: AuthSession,
  locale: Locale,
  role: DashboardRole,
): Promise<MockEqaLoadResult | "demo"> {
  if (!useDatabaseReads()) {
    return "demo";
  }
  return createMockEqaLoader(getAppDatabase()).load(session, locale, role);
}

export async function loadEvidencePackData(
  session: AuthSession,
  locale: Locale,
  role: DashboardRole,
): Promise<EvidencePackLoadResult | "demo"> {
  if (!useDatabaseReads()) {
    return "demo";
  }
  return createEvidencePackLoader(getAppDatabase()).load(session, locale, role);
}

export async function loadStandardDetailData(
  session: AuthSession,
  locale: Locale,
  role: DashboardRole,
  standardNumber: string,
): Promise<StandardDetailLoadResult | null | "demo"> {
  if (!useDatabaseReads()) {
    return "demo";
  }
  return createStandardDetailLoader(getAppDatabase()).load(
    session,
    locale,
    role,
    standardNumber,
  );
}

export async function loadStandardsWorkspaceData(
  session: AuthSession,
  locale: Locale,
  role: DashboardRole,
): Promise<StandardsWorkspaceLoadResult | "demo"> {
  if (!useDatabaseReads()) {
    return "demo";
  }
  return createStandardsWorkspaceLoader(getAppDatabase()).load(
    session,
    locale,
    role,
  );
}
