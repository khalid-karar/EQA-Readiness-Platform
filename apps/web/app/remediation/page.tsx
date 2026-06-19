import { RemediationClient } from "@/components/remediation/remediation-client";
import {
  buildRemediationPresentation,
  parseRemediationParams,
} from "@/lib/present-remediation";

interface RemediationPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RemediationPage({
  searchParams,
}: RemediationPageProps): Promise<React.ReactNode> {
  const params = await searchParams;
  const { locale, role } = parseRemediationParams(params);
  const presentation = buildRemediationPresentation(locale, role);

  return <RemediationClient presentation={presentation} />;
}
