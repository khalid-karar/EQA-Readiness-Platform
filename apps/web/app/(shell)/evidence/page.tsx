import { EvidenceClient } from "@/components/evidence/evidence-client";
import { requireServerSession } from "@/lib/auth/get-server-session";
import { resolvePageLocaleAndRole } from "@/lib/auth/page-context";
import { metadataForShellPage } from "@/lib/page-metadata";
import { loadEvidenceData } from "@/lib/load-screen-data";
import {
  buildEvidencePresentation,
  buildEvidencePresentationFromLoad,
} from "@/lib/present-evidence";
import { isRealWritesEnabled } from "@/lib/real-writes";
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
  const session = await requireServerSession();
  const data = await loadEvidenceData(session, locale, role);
  const presentation =
    data === "demo"
      ? buildEvidencePresentation(locale, role)
      : buildEvidencePresentationFromLoad(data);

  return (
    <EvidenceClient
      presentation={presentation}
      realWritesEnabled={isRealWritesEnabled()}
    />
  );
}
