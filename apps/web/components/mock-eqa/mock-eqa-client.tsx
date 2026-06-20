"use client";

import { useState } from "react";
import type { MockEqaPresentation } from "@/lib/present-mock-eqa";
import { WhatsNextPanel } from "@/components/orientation/whats-next-panel";
import { SimulationDisclaimerBanner } from "@/components/mock-eqa/simulation-disclaimer";
import {
  MockEqaDomainBreakdown,
  MockEqaGapDetailPanel,
  MockEqaOverallCard,
} from "@/components/mock-eqa/mock-eqa-panels";
import { useSyncShellMeta } from "@/components/shell/use-sync-shell-meta";
import { DEFAULT_TENANT_NAME } from "@/lib/nav-config";
import { uiLabel } from "@/lib/ui-labels";
import { Button } from "@/components/ui/button";

interface MockEqaClientProps {
  presentation: MockEqaPresentation;
}

export function MockEqaClient({
  presentation,
}: MockEqaClientProps): React.ReactNode {
  const { view, roleLabel } = presentation;
  const [selectedStandard, setSelectedStandard] = useState<string | null>(null);

  const location = selectedStandard
    ? `${uiLabel("standard", view.locale)} ${selectedStandard}`
    : uiLabel("mockEqaLocation", view.locale);

  const pendingActions = view.isSummaryView
    ? []
    : [
        {
          id: "run-simulation",
          count: 1,
          label:
            view.locale === "ar"
              ? "تشغيل محاكاة جاهزية جديدة (تجريبي)"
              : "Run a new readiness simulation (demo)",
          priority: "medium" as const,
        },
      ];

  useSyncShellMeta({
    locale: view.locale,
    tenantName: DEFAULT_TENANT_NAME,
    assessmentName: view.assessmentName,
    location,
    roleLabel,
    isSummaryView: view.isSummaryView,
  });

  return (
    <div className="space-y-6">
      <SimulationDisclaimerBanner presentation={presentation} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <MockEqaOverallCard presentation={presentation} />
          <MockEqaDomainBreakdown
            presentation={presentation}
            selectedStandard={selectedStandard}
            onSelectStandard={setSelectedStandard}
          />
        </div>

        <aside className="space-y-6">
          {view.canRunSimulation ? (
            <div className="rounded-lg border bg-surface p-4 shadow-sm">
              <p className="mb-3 text-sm text-muted-foreground">
                {uiLabel("mockEqaRunHint", view.locale)}
              </p>
              <Button
                size="sm"
                disabled
                title="Demo UI — job wired in backend"
              >
                {uiLabel("mockEqaRunButton", view.locale)}
              </Button>
            </div>
          ) : null}
          <WhatsNextPanel
            locale={view.locale}
            isSummaryView={view.isSummaryView}
            pendingActions={pendingActions}
            summaryHint={uiLabel("mockEqaBoardHint", view.locale)}
          />
          <MockEqaGapDetailPanel
            presentation={presentation}
            selectedStandard={selectedStandard}
          />
        </aside>
      </div>
    </div>
  );
}
