import { EvidenceClient } from "@/components/evidence/evidence-client";
import { buildEvidencePresentation } from "@/lib/present-evidence";
import { resolvePageLocaleAndRole } from "@/lib/auth/page-context";
import { metadataForShellPage } from "@/lib/page-metadata";
import type { Metadata } from "next";

interface EvidencePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  searchParams,
}: EvidencePageProps): Promise<Metadata> {
  return metadataForShellPage("evidence", searchParams);
}

export default async function EvidencePage({
  searchParams,
}: EvidencePageProps): Promise<React.ReactNode> {
  const params = await searchParams;
  const { locale, role } = await resolvePageLocaleAndRole(params);

  const presentation = buildEvidencePresentation(locale, role);

  return <EvidenceClient presentation={presentation} />;
}
