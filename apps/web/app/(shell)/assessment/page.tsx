import { AssessmentClient } from "@/components/assessment/assessment-client";
import { requireServerSession } from "@/lib/auth/get-server-session";
import { resolvePageLocaleAndRole } from "@/lib/auth/page-context";
import { metadataForShellPage } from "@/lib/page-metadata";
import { loadAssessmentData } from "@/lib/load-screen-data";
import { isRealWritesEnabled } from "@/lib/real-writes";
import {
  buildAssessmentPresentation,
  buildAssessmentPresentationFromLoad,
} from "@/lib/present-assessment";
import type { Metadata } from "next";

interface AssessmentPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  searchParams,
}: AssessmentPageProps): Promise<Metadata> {
  return metadataForShellPage("assessment", searchParams);
}

export default async function AssessmentPage({
  searchParams,
}: AssessmentPageProps): Promise<React.ReactNode> {
  const params = await searchParams;
  const { locale, role } = await resolvePageLocaleAndRole(params);
  const session = await requireServerSession();
  const data = await loadAssessmentData(session, locale, role);
  const presentation =
    data === "demo"
      ? buildAssessmentPresentation(locale, role)
      : buildAssessmentPresentationFromLoad(data);

  return (
    <AssessmentClient
      presentation={presentation}
      realWritesEnabled={isRealWritesEnabled()}
    />
  );
}
