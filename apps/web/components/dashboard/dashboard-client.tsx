"use client";

import { Suspense, useState } from "react";
import type { DashboardPresentation } from "@/lib/present-dashboard";
import type { PresentedHeatMapCell } from "@/lib/present-dashboard";
import { WhatsNextPanel } from "@/components/orientation/whats-next-panel";
import { ConformanceHeatMap } from "@/components/dashboard/conformance-heatmap";
import { CockpitMetrics } from "@/components/dashboard/cockpit-metrics";
import { useSyncShellMeta } from "@/components/shell/use-sync-shell-meta";
import { DEFAULT_TENANT_NAME } from "@/lib/nav-config";
import { uiLabel } from "@/lib/ui-labels";

interface DashboardClientProps {
  presentation: DashboardPresentation;
}

function DashboardClientInner({
  presentation,
}: DashboardClientProps): React.ReactNode {
  const { view, roleLabel, cellPresentation, domainRollups } = presentation;
  const [selectedCell, setSelectedCell] = useState<PresentedHeatMapCell | null>(
    null,
  );

  const location = selectedCell
    ? `${selectedCell.domainNumber} › ${selectedCell.principleNumber} › ${selectedCell.standardNumber} ${selectedCell.standardTitle}`
    : uiLabel("cockpitLocation", view.locale);

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
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {uiLabel("cockpitTitle", view.locale)}
        </h1>
        <p className="text-sm text-muted-foreground">
          {uiLabel("cockpitSubtitle", view.locale)}
        </p>
      </header>

      <CockpitMetrics view={view} />

      <div
        className={
          view.isSummaryView
            ? "space-y-6"
            : "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]"
        }
      >
        <ConformanceHeatMap
          view={view}
          cellPresentation={cellPresentation}
          domainRollups={domainRollups}
          selectedStandard={selectedCell?.standardNumber ?? null}
          onSelect={setSelectedCell}
        />

        {!view.isSummaryView ? (
          <aside>
            <WhatsNextPanel
              locale={view.locale}
              isSummaryView={false}
              pendingActions={view.pendingActions}
            />
          </aside>
        ) : null}
      </div>
    </div>
  );
}

export function DashboardClient({
  presentation,
}: DashboardClientProps): React.ReactNode {
  return (
    <Suspense fallback={null}>
      <DashboardClientInner presentation={presentation} />
    </Suspense>
  );
}
