import { FindingsClient } from "@/components/findings/findings-client";
import { buildFindingsPresentation } from "@/lib/present-findings";
import { parseLocale, parseRole } from "@/lib/dashboard-params";
import { metadataForShellPage } from "@/lib/page-metadata";
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
  const locale = parseLocale(
    typeof params.locale === "string" ? params.locale : undefined,
  );
  const role = parseRole(
    typeof params.role === "string" ? params.role : undefined,
  );

  const presentation = buildFindingsPresentation(locale, role);

  return <FindingsClient presentation={presentation} />;
}
