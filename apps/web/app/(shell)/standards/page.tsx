import { StandardsWorkspaceClient } from "@/components/standards/standards-workspace-client";
import { requireShellPageContext } from "@/lib/auth/page-context";
import { metadataForShellPage } from "@/lib/page-metadata";
import { loadStandardsWorkspaceData } from "@/lib/load-screen-data";
import {
  buildStandardsWorkspacePresentation,
  buildStandardsWorkspacePresentationFromLoad,
} from "@/lib/present-standards-workspace";
import type { Metadata } from "next";

interface StandardsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  searchParams,
}: StandardsPageProps): Promise<Metadata> {
  return metadataForShellPage("standards", searchParams);
}

export default async function StandardsPage({
  searchParams,
}: StandardsPageProps): Promise<React.ReactNode> {
  const params = await searchParams;
  const { session, locale, role } = await requireShellPageContext(params);
  const data = await loadStandardsWorkspaceData(session, locale, role);
  const presentation =
    data === "demo"
      ? buildStandardsWorkspacePresentation(locale, role)
      : buildStandardsWorkspacePresentationFromLoad(data);

  return <StandardsWorkspaceClient presentation={presentation} />;
}
