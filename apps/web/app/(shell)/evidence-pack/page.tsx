import { EvidencePackClient } from "@/components/evidence-pack/evidence-pack-client";
import { requireServerSession } from "@/lib/auth/get-server-session";
import { resolvePageLocaleAndRole } from "@/lib/auth/page-context";
import { metadataForShellPage } from "@/lib/page-metadata";
import { loadEvidencePackData } from "@/lib/load-screen-data";
import {
  buildEvidencePackPresentation,
  buildEvidencePackPresentationFromLoad,
} from "@/lib/present-evidence-pack";
import type { Metadata } from "next";

interface EvidencePackPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  searchParams,
}: EvidencePackPageProps): Promise<Metadata> {
  return metadataForShellPage("evidence-pack", searchParams);
}

export default async function EvidencePackPage({
  searchParams,
}: EvidencePackPageProps): Promise<React.ReactNode> {
  const params = await searchParams;
  const { locale, role } = await resolvePageLocaleAndRole(params);
  const session = await requireServerSession();
  const data = await loadEvidencePackData(session, locale, role);
  const presentation =
    data === "demo"
      ? buildEvidencePackPresentation(locale, role)
      : buildEvidencePackPresentationFromLoad(data);

  return <EvidencePackClient presentation={presentation} />;
}
