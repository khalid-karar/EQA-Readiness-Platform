"use client";

import Link from "next/link";
import type { EvidencePackPresentation } from "@/lib/present-evidence-pack";
import { WhatsNextPanel } from "@/components/orientation/whats-next-panel";
import { PackDisclaimerBanner } from "@/components/evidence-pack/pack-disclaimer";
import { EvidencePackSummaryCard } from "@/components/evidence-pack/evidence-pack-panels";
import { useSyncShellMeta } from "@/components/shell/use-sync-shell-meta";
import { DEFAULT_TENANT_NAME } from "@/lib/nav-config";
import { uiLabel } from "@/lib/ui-labels";
import { Button } from "@/components/ui/button";

interface EvidencePackClientProps {
  presentation: EvidencePackPresentation;
}

export function EvidencePackClient({
  presentation,
}: EvidencePackClientProps): React.ReactNode {
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

  useSyncShellMeta({
    locale: presentation.locale,
    tenantName: DEFAULT_TENANT_NAME,
    assessmentName: presentation.assessmentName,
    location: uiLabel("packLocation", presentation.locale),
    roleLabel: presentation.roleLabel,
    isSummaryView: presentation.isSummaryView,
  });

  return (
    <div className="space-y-6">
      <PackDisclaimerBanner presentation={presentation} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <EvidencePackSummaryCard presentation={presentation} />

          <div className="space-y-3 rounded-lg border bg-surface p-4 shadow-sm">
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
            <div className="space-y-3 rounded-lg border bg-surface p-4 shadow-sm">
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

          <div className="space-y-3 rounded-lg border bg-surface p-4 shadow-sm">
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
    </div>
  );
}
