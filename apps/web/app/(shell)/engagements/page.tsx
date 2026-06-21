import { EngagementsClient } from "@/components/engagements/engagements-client";
import { requireShellPageContext } from "@/lib/auth/page-context";
import { metadataForShellPage } from "@/lib/page-metadata";
import { loadEngagementsData } from "@/lib/load-screen-data";
import { isRealWritesEnabled } from "@/lib/real-writes";
import {
  buildEngagementsPresentation,
  buildEngagementsPresentationFromLoad,
} from "@/lib/present-engagements";
import type { Metadata } from "next";

interface EngagementsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  searchParams,
}: EngagementsPageProps): Promise<Metadata> {
  return metadataForShellPage("engagements", searchParams);
}

export default async function EngagementsPage({
  searchParams,
}: EngagementsPageProps): Promise<React.ReactNode> {
  const params = await searchParams;
  const { session, locale, role } = await requireShellPageContext(params);
  const data = await loadEngagementsData(session, locale, role);
  const presentation =
    data === "demo"
      ? buildEngagementsPresentation(locale, role)
      : buildEngagementsPresentationFromLoad(data);

  return (
    <EngagementsClient
      presentation={presentation}
      realWritesEnabled={isRealWritesEnabled()}
    />
  );
}
