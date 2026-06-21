import { buildEvidencePackPresentation } from "@/lib/present-evidence-pack";
import { resolvePageLocaleAndRole } from "@/lib/auth/page-context";
import { EvidencePackClient } from "@/components/evidence-pack/evidence-pack-client";
import { metadataForShellPage } from "@/lib/page-metadata";
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

  const presentation = buildEvidencePackPresentation(locale, role);

  return <EvidencePackClient presentation={presentation} />;
}
