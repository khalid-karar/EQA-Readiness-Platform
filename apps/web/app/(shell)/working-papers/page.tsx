import { WorkingPapersClient } from "@/components/working-papers/working-papers-client";
import { buildWorkingPapersPresentation } from "@/lib/present-working-papers";
import { parseLocale, parseRole } from "@/lib/dashboard-params";

interface WorkingPapersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function WorkingPapersPage({
  searchParams,
}: WorkingPapersPageProps): Promise<React.ReactNode> {
  const params = await searchParams;
  const locale = parseLocale(
    typeof params.locale === "string" ? params.locale : undefined,
  );
  const role = parseRole(
    typeof params.role === "string" ? params.role : undefined,
  );

  const presentation = buildWorkingPapersPresentation(locale, role);

  return <WorkingPapersClient presentation={presentation} />;
}
