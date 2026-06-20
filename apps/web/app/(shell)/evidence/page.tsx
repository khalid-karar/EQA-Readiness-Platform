import { EvidenceClient } from "@/components/evidence/evidence-client";
import { buildEvidencePresentation } from "@/lib/present-evidence";
import { parseLocale, parseRole } from "@/lib/dashboard-params";

interface EvidencePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function EvidencePage({
  searchParams,
}: EvidencePageProps): Promise<React.ReactNode> {
  const params = await searchParams;
  const locale = parseLocale(
    typeof params.locale === "string" ? params.locale : undefined,
  );
  const role = parseRole(
    typeof params.role === "string" ? params.role : undefined,
  );

  const presentation = buildEvidencePresentation(locale, role);

  return <EvidenceClient presentation={presentation} />;
}
