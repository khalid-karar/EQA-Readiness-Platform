import { WorkingPapersClient } from "@/components/working-papers/working-papers-client";
import { requireServerSession } from "@/lib/auth/get-server-session";
import { resolvePageLocaleAndRole } from "@/lib/auth/page-context";
import { metadataForShellPage } from "@/lib/page-metadata";
import { loadWorkingPapersData } from "@/lib/load-screen-data";
import {
  buildWorkingPapersPresentation,
  buildWorkingPapersPresentationFromLoad,
} from "@/lib/present-working-papers";
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
  const session = await requireServerSession();
  const data = await loadWorkingPapersData(session, locale, role);
  const presentation =
    data === "demo"
      ? buildWorkingPapersPresentation(locale, role)
      : buildWorkingPapersPresentationFromLoad(data);

  return <WorkingPapersClient presentation={presentation} />;
}
