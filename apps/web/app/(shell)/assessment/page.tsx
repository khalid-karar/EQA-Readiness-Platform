import { AssessmentClient } from "@/components/assessment/assessment-client";
import { buildAssessmentPresentation } from "@/lib/present-assessment";
import { parseLocale, parseRole } from "@/lib/dashboard-params";
import { metadataForShellPage } from "@/lib/page-metadata";
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
  const locale = parseLocale(
    typeof params.locale === "string" ? params.locale : undefined,
  );
  const role = parseRole(
    typeof params.role === "string" ? params.role : undefined,
  );

  const presentation = buildAssessmentPresentation(locale, role);

  return <AssessmentClient presentation={presentation} />;
}
