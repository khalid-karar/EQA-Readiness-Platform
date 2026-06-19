"use client";

import { Suspense, useState } from "react";
import type { DashboardPresentation } from "@/lib/present-dashboard";
import type { PresentedHeatMapCell } from "@/lib/present-dashboard";
import { ContextBar } from "@/components/orientation/context-bar";
import { ProgressIndicator } from "@/components/orientation/progress-indicator";
import { WhatsNextPanel } from "@/components/orientation/whats-next-panel";
import { ConformanceHeatMap } from "@/components/dashboard/conformance-heatmap";
import { ReadinessIndicator } from "@/components/dashboard/readiness-indicator";
import {
  DemoControls,
  StandardDetailPanel,
} from "@/components/dashboard/demo-controls";

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
        view={view}
        roleLabel={roleLabel}
        selectedCell={selectedCell}
      />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <Suspense fallback={null}>
          <DemoControls locale={view.locale} role={view.role} />
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
            <WhatsNextPanel view={view} />
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
