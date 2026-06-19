import { buildDashboardPresentation } from "@/lib/present-dashboard";
import { parseLocale, parseRole } from "@/lib/dashboard-params";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

interface DashboardPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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
