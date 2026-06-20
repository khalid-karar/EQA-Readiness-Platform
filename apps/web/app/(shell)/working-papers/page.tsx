import { WorkingPapersClient } from "@/components/working-papers/working-papers-client";
import { buildWorkingPapersPresentation } from "@/lib/present-working-papers";
import { parseLocale, parseRole } from "@/lib/dashboard-params";
import { metadataForShellPage } from "@/lib/page-metadata";
import type { Metadata } from "next";

interface WorkingPapersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  searchParams,
}: WorkingPapersPageProps): Promise<Metadata> {
  return metadataForShellPage("working-papers", searchParams);
}

export default async function WorkingPapersPage({
  searchParams,
}: WorkingPapersPageProps): Promise<React.ReactNode> {
  const params = await searchParams;
  const locale = parseLocale(
    typeof params.locale === "string" ? params.locale : undefined,
  );
  const role = parseRole(
    typeof params.role === "string" ? params.role : undefined,
  );

  const presentation = buildWorkingPapersPresentation(locale, role);

  return <WorkingPapersClient presentation={presentation} />;
}
