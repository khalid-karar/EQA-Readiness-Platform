import { buildDashboardPresentation } from "@/lib/present-dashboard";
import { parseLocale, parseRole } from "@/lib/dashboard-params";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { metadataForShellPage } from "@/lib/page-metadata";
import type { Metadata } from "next";

interface DashboardPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  searchParams,
}: DashboardPageProps): Promise<Metadata> {
  return metadataForShellPage("dashboard", searchParams);
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps): Promise<React.ReactNode> {
  const params = await searchParams;
  const locale = parseLocale(
    typeof params.locale === "string" ? params.locale : undefined,
  );
  const role = parseRole(
    typeof params.role === "string" ? params.role : undefined,
  );

  const presentation = buildDashboardPresentation(locale, role);

  return <DashboardClient presentation={presentation} />;
}
