import { RemediationClient } from "@/components/remediation/remediation-client";
import { requireServerSession } from "@/lib/auth/get-server-session";
import { resolvePageLocaleAndRole } from "@/lib/auth/page-context";
import { metadataForShellPage } from "@/lib/page-metadata";
import { loadRemediationTrackerView } from "@/lib/load-screen-data";
import { isRealWritesEnabled } from "@/lib/real-writes";
import {
  buildRemediationPresentation,
  buildRemediationPresentationFromView,
} from "@/lib/present-remediation";
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
  const session = await requireServerSession();
  const view = await loadRemediationTrackerView(session, locale, role);
  const presentation =
    view === "demo"
      ? buildRemediationPresentation(locale, role)
      : buildRemediationPresentationFromView(view);

  return (
    <RemediationClient
      presentation={presentation}
      realWritesEnabled={isRealWritesEnabled()}
    />
  );
}
