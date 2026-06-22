import { StandardDetailClient } from "@/components/standards/standard-detail-client";
import { requireShellPageContext } from "@/lib/auth/page-context";
import { metadataForShellPage } from "@/lib/page-metadata";
import { loadStandardDetailData } from "@/lib/load-screen-data";
import {
  buildStandardDetailPresentation,
  buildStandardDetailPresentationFromLoad,
} from "@/lib/present-standard-detail";
import { isRealWritesEnabled } from "@/lib/real-writes";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface StandardDetailPageProps {
  params: Promise<{ standardId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  searchParams,
}: StandardDetailPageProps): Promise<Metadata> {
  return metadataForShellPage("standard-detail", searchParams);
}

export default async function StandardDetailPage({
  params,
  searchParams,
}: StandardDetailPageProps): Promise<React.ReactNode> {
  const [{ standardId }, query] = await Promise.all([params, searchParams]);
  const standardNumber = decodeURIComponent(standardId);
  const { session, locale, role } = await requireShellPageContext(query);
  const data = await loadStandardDetailData(
    session,
    locale,
    role,
    standardNumber,
  );

  const presentation =
    data === "demo"
      ? buildStandardDetailPresentation(locale, role, standardNumber)
      : data === null
        ? null
        : buildStandardDetailPresentationFromLoad(data);

  if (!presentation) {
    notFound();
  }

  return (
    <StandardDetailClient
      presentation={presentation}
      realWritesEnabled={isRealWritesEnabled()}
    />
  );
}
