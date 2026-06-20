"use client";

import { Suspense } from "react";
import Link from "next/link";
import type { EvidencePackPresentation } from "@/lib/present-evidence-pack";
import { ContextBar } from "@/components/orientation/context-bar";
import { WhatsNextPanel } from "@/components/orientation/whats-next-panel";
import { ViewControls } from "@/components/demo/view-controls";
import { PackDisclaimerBanner } from "@/components/evidence-pack/pack-disclaimer";
import { EvidencePackSummaryCard } from "@/components/evidence-pack/evidence-pack-panels";
import { uiLabel } from "@/lib/ui-labels";
import { Button } from "@/components/ui/button";

interface EvidencePackClientProps {
  presentation: EvidencePackPresentation;
}

export function EvidencePackClient({
  presentation,
}: EvidencePackClientProps): React.ReactNode {
  const dir = presentation.locale === "ar" ? "rtl" : "ltr";

  const pendingActions = presentation.canGenerate
    ? [
        {
          id: "generate-pack",
          count: 1,
          label: uiLabel("packGenerateAction", presentation.locale),
          priority: "high" as const,
        },
      ]
    : [];

  return (
    <div dir={dir} lang={presentation.locale} className="min-h-screen">
      <ContextBar
        assessmentName={presentation.assessmentName}
        locale={presentation.locale}
        roleLabel={presentation.roleLabel}
        location={uiLabel("packLocation", presentation.locale)}
        isSummaryView={presentation.isSummaryView}
      />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <PackDisclaimerBanner presentation={presentation} />

        <Suspense fallback={null}>
          <ViewControls
            locale={presentation.locale}
            role={presentation.role}
            basePath="/evidence-pack"
          />
        </Suspense>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <EvidencePackSummaryCard presentation={presentation} />

            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                {uiLabel("packContentsHint", presentation.locale)}
              </p>
              <ul className="list-disc space-y-1 ps-5 text-sm">
                <li>{uiLabel("packContentsIndex", presentation.locale)}</li>
                <li>{uiLabel("packContentsNotes", presentation.locale)}</li>
                <li>{uiLabel("packContentsGaps", presentation.locale)}</li>
                <li>
                  {uiLabel("packContentsRemediation", presentation.locale)}
                </li>
                <li>{uiLabel("packContentsReadiness", presentation.locale)}</li>
              </ul>
            </div>
          </div>

          <aside className="space-y-6">
            {presentation.canGenerate ? (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  {uiLabel("packGenerateHint", presentation.locale)}
                </p>
                <Button
                  size="sm"
                  disabled
                  title="Demo UI — job wired in backend"
                >
                  {uiLabel("packGenerateButton", presentation.locale)}
                </Button>
              </div>
            ) : null}

            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium">
                {uiLabel("packDownloadTitle", presentation.locale)}
              </p>
              <p className="text-xs text-muted-foreground">
                {uiLabel("packDownloadHint", presentation.locale)}
              </p>
              <Button size="sm" asChild>
                <Link
                  href={presentation.sampleDownloadPath}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {uiLabel("packDownloadButton", presentation.locale)}
                </Link>
              </Button>
            </div>

            <WhatsNextPanel
              locale={presentation.locale}
              isSummaryView={presentation.isSummaryView}
              pendingActions={pendingActions}
              summaryHint={uiLabel("packBoardHint", presentation.locale)}
            />
          </aside>
        </div>
      </main>
    </div>
  );
}
