import { buildMockEqaPresentation } from "@/lib/present-mock-eqa";
import { parseLocale, parseRole } from "@/lib/dashboard-params";
import { MockEqaClient } from "@/components/mock-eqa/mock-eqa-client";
import { metadataForShellPage } from "@/lib/page-metadata";
import type { Metadata } from "next";

interface MockEqaPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  searchParams,
}: MockEqaPageProps): Promise<Metadata> {
  return metadataForShellPage("mock-eqa", searchParams);
}

export default async function MockEqaPage({
  searchParams,
}: MockEqaPageProps): Promise<React.ReactNode> {
  const params = await searchParams;
  const locale = parseLocale(
    typeof params.locale === "string" ? params.locale : undefined,
  );
  const role = parseRole(
    typeof params.role === "string" ? params.role : undefined,
  );

  const presentation = buildMockEqaPresentation(locale, role);

  return <MockEqaClient presentation={presentation} />;
}
