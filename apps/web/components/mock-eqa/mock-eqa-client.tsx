"use client";

import { Suspense, useState } from "react";
import type { MockEqaPresentation } from "@/lib/present-mock-eqa";
import { ContextBar } from "@/components/orientation/context-bar";
import { WhatsNextPanel } from "@/components/orientation/whats-next-panel";
import { ViewControls } from "@/components/demo/view-controls";
import { SimulationDisclaimerBanner } from "@/components/mock-eqa/simulation-disclaimer";
import {
  MockEqaDomainBreakdown,
  MockEqaGapDetailPanel,
  MockEqaOverallCard,
} from "@/components/mock-eqa/mock-eqa-panels";
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
  const dir = view.locale === "ar" ? "rtl" : "ltr";

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

  return (
    <div dir={dir} lang={view.locale} className="min-h-screen">
      <ContextBar
        assessmentName={view.assessmentName}
        locale={view.locale}
        roleLabel={roleLabel}
        location={location}
        isSummaryView={view.isSummaryView}
      />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <SimulationDisclaimerBanner presentation={presentation} />

        <Suspense fallback={null}>
          <ViewControls
            locale={view.locale}
            role={view.role}
            basePath="/mock-eqa"
          />
        </Suspense>

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
              <div className="rounded-lg border bg-muted/30 p-4">
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
      </main>
    </div>
  );
}
