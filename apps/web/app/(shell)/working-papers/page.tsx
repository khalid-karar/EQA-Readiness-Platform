import { WorkingPapersClient } from "@/components/working-papers/working-papers-client";
import { requireShellPageContext } from "@/lib/auth/page-context";
import { metadataForShellPage } from "@/lib/page-metadata";
import { loadWorkingPapersData } from "@/lib/load-screen-data";
import { isRealWritesEnabled } from "@/lib/real-writes";
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
  const { session, locale, role } = await requireShellPageContext(params);
  const data = await loadWorkingPapersData(session, locale, role);
  const presentation =
    data === "demo"
      ? buildWorkingPapersPresentation(locale, role)
      : buildWorkingPapersPresentationFromLoad(data);

  return (
    <WorkingPapersClient
      presentation={presentation}
      realWritesEnabled={isRealWritesEnabled()}
    />
  );
}
