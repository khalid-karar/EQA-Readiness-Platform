import { RemediationClient } from "@/components/remediation/remediation-client";
import { resolvePageLocaleAndRole } from "@/lib/auth/page-context";
import {
  buildRemediationPresentation,
} from "@/lib/present-remediation";
import { metadataForShellPage } from "@/lib/page-metadata";
import type { Metadata } from "next";

interface RemediationPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  searchParams,
}: RemediationPageProps): Promise<Metadata> {
  return metadataForShellPage("remediation", searchParams);
}

export default async function RemediationPage({
  searchParams,
}: RemediationPageProps): Promise<React.ReactNode> {
  const params = await searchParams;
  const { locale, role } = await resolvePageLocaleAndRole(params);
  const presentation = buildRemediationPresentation(locale, role);

  return <RemediationClient presentation={presentation} />;
}
