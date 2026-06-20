"use client";

import { Suspense, useState } from "react";
import type { DashboardPresentation } from "@/lib/present-dashboard";
import type { PresentedHeatMapCell } from "@/lib/present-dashboard";
import { ProgressIndicator } from "@/components/orientation/progress-indicator";
import { WhatsNextPanel } from "@/components/orientation/whats-next-panel";
import { ConformanceHeatMap } from "@/components/dashboard/conformance-heatmap";
import { ReadinessIndicator } from "@/components/dashboard/readiness-indicator";
import { ReadinessJourneyMap } from "@/components/dashboard/readiness-journey-map";
import { StandardDetailPanel } from "@/components/dashboard/demo-controls";
import { useSyncShellMeta } from "@/components/shell/use-sync-shell-meta";
import { DEFAULT_TENANT_NAME } from "@/lib/nav-config";
import { uiLabel } from "@/lib/ui-labels";

interface DashboardClientProps {
  presentation: DashboardPresentation;
}

export function DashboardClient({
  presentation,
}: DashboardClientProps): React.ReactNode {
  const { view, roleLabel, cellPresentation, statusLabels, journeyMap } =
    presentation;
  const [selectedCell, setSelectedCell] = useState<PresentedHeatMapCell | null>(
    null,
  );

  const location = selectedCell
    ? `${selectedCell.domainNumber} › ${selectedCell.principleNumber} › ${selectedCell.standardNumber} ${selectedCell.standardTitle}`
    : uiLabel("overview", view.locale);

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
      <Suspense fallback={null}>
        <ReadinessJourneyMap journeyMap={journeyMap} locale={view.locale} />
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
    </div>
  );
}
