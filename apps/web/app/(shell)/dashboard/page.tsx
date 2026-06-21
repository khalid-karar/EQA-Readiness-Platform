import { requireServerSession } from "@/lib/auth/get-server-session";
import { resolvePageLocaleAndRole } from "@/lib/auth/page-context";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { metadataForShellPage } from "@/lib/page-metadata";
import { loadDashboardInput } from "@/lib/load-screen-data";
import { loadJourneyMapOptionsOrDemo } from "@/lib/load-journey-options";
import { buildDashboardPresentationFromInput } from "@/lib/present-dashboard";
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
  const { locale, role } = await resolvePageLocaleAndRole(params);
  const session = await requireServerSession();
  const journeyOptions = await loadJourneyMapOptionsOrDemo(
    session,
    locale,
    role,
  );
  const input = await loadDashboardInput(session, locale, role);
  const presentation = buildDashboardPresentationFromInput(input, journeyOptions);

  return <DashboardClient presentation={presentation} />;
}
