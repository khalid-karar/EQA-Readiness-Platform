"use client";

import { Suspense, useState } from "react";
import type { DashboardPresentation } from "@/lib/present-dashboard";
import type { PresentedHeatMapCell } from "@/lib/present-dashboard";
import { ContextBar } from "@/components/orientation/context-bar";
import { ProgressIndicator } from "@/components/orientation/progress-indicator";
import { WhatsNextPanel } from "@/components/orientation/whats-next-panel";
import { ConformanceHeatMap } from "@/components/dashboard/conformance-heatmap";
import { ReadinessIndicator } from "@/components/dashboard/readiness-indicator";
import { ViewControls } from "@/components/demo/view-controls";
import { StandardDetailPanel } from "@/components/dashboard/demo-controls";
import { uiLabel } from "@/lib/ui-labels";

interface DashboardClientProps {
  presentation: DashboardPresentation;
}

export function DashboardClient({
  presentation,
}: DashboardClientProps): React.ReactNode {
  const { view, roleLabel, cellPresentation, statusLabels } = presentation;
  const [selectedCell, setSelectedCell] = useState<PresentedHeatMapCell | null>(
    null,
  );
  const dir = view.locale === "ar" ? "rtl" : "ltr";

  return (
    <div dir={dir} lang={view.locale} className="min-h-screen">
      <ContextBar
        assessmentName={view.assessmentName}
        locale={view.locale}
        roleLabel={roleLabel}
        location={
          selectedCell
            ? `${selectedCell.domainNumber} › ${selectedCell.principleNumber} › ${selectedCell.standardNumber} ${selectedCell.standardTitle}`
            : uiLabel("overview", view.locale)
        }
        isSummaryView={view.isSummaryView}
      />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <Suspense fallback={null}>
          <ViewControls
            locale={view.locale}
            role={view.role}
            basePath="/dashboard"
          />
        </Suspense>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <ReadinessIndicator view={view} />
            <ConformanceHeatMap
              view={view}
              cellPresentation={cellPresentation}
              selectedStandard={selectedCell?.standardNumber ?? null}
              onSelect={setSelectedCell}
            />
          </div>

          <aside className="space-y-6">
            <ProgressIndicator view={view} />
            <WhatsNextPanel
              locale={view.locale}
              isSummaryView={view.isSummaryView}
              pendingActions={view.pendingActions}
            />
            <StandardDetailPanel
              cell={selectedCell}
              view={view}
              statusLabels={statusLabels}
            />
          </aside>
        </div>
      </main>
    </div>
  );
}
