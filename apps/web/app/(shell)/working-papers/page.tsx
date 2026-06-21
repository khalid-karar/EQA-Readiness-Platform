import { WorkingPapersClient } from "@/components/working-papers/working-papers-client";
import { buildWorkingPapersPresentation } from "@/lib/present-working-papers";
import { resolvePageLocaleAndRole } from "@/lib/auth/page-context";
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
  const { locale, role } = await resolvePageLocaleAndRole(params);

  const presentation = buildWorkingPapersPresentation(locale, role);

  return <WorkingPapersClient presentation={presentation} />;
}
