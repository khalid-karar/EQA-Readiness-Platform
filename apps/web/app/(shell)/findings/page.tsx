import { FindingsClient } from "@/components/findings/findings-client";
import { requireServerSession } from "@/lib/auth/get-server-session";
import { resolvePageLocaleAndRole } from "@/lib/auth/page-context";
import { metadataForShellPage } from "@/lib/page-metadata";
import { loadFindingsData } from "@/lib/load-screen-data";
import {
  buildFindingsPresentation,
  buildFindingsPresentationFromLoad,
} from "@/lib/present-findings";
import type { Metadata } from "next";

interface FindingsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  searchParams,
}: FindingsPageProps): Promise<Metadata> {
  return metadataForShellPage("findings", searchParams);
}

export default async function FindingsPage({
  searchParams,
}: FindingsPageProps): Promise<React.ReactNode> {
  const params = await searchParams;
  const { locale, role } = await resolvePageLocaleAndRole(params);
  const session = await requireServerSession();
  const data = await loadFindingsData(session, locale, role);
  const presentation =
    data === "demo"
      ? buildFindingsPresentation(locale, role)
      : buildFindingsPresentationFromLoad(data);

  return <FindingsClient presentation={presentation} />;
}
