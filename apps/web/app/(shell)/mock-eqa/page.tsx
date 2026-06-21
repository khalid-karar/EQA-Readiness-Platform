import { MockEqaClient } from "@/components/mock-eqa/mock-eqa-client";
import { requireServerSession } from "@/lib/auth/get-server-session";
import { resolvePageLocaleAndRole } from "@/lib/auth/page-context";
import { metadataForShellPage } from "@/lib/page-metadata";
import { loadMockEqaData } from "@/lib/load-screen-data";
import {
  buildMockEqaPresentation,
  buildMockEqaPresentationFromLoad,
} from "@/lib/present-mock-eqa";
import { isRealWritesEnabled } from "@/lib/real-writes";
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
  const { locale, role } = await resolvePageLocaleAndRole(params);
  const session = await requireServerSession();
  const data = await loadMockEqaData(session, locale, role);
  const presentation =
    data === "demo"
      ? buildMockEqaPresentation(locale, role)
      : buildMockEqaPresentationFromLoad(data);

  return (
    <MockEqaClient
      presentation={presentation}
      realWritesEnabled={isRealWritesEnabled()}
    />
  );
}
