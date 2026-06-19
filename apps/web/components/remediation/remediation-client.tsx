"use client";

import { Suspense, useState } from "react";
import type { RemediationPresentation } from "@/lib/present-remediation";
import { ContextBar } from "@/components/orientation/context-bar";
import { WhatsNextPanel } from "@/components/orientation/whats-next-panel";
import { ViewControls } from "@/components/demo/view-controls";
import { uiLabel } from "@/lib/ui-labels";
import {
  RemediationDetailPanel,
  RemediationSummary,
  RemediationTable,
} from "@/components/remediation/remediation-panels";

interface RemediationClientProps {
  presentation: RemediationPresentation;
}

export function RemediationClient({
  presentation,
}: RemediationClientProps): React.ReactNode {
  const { view, roleLabel } = presentation;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dir = view.locale === "ar" ? "rtl" : "ltr";

  const selectedRow = view.items.find((i) => i.remediationId === selectedId);
  const location = selectedRow
    ? `${selectedRow.standardNumber} — ${selectedRow.standardTitle}`
    : uiLabel("remediationLocation", view.locale);

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
        <Suspense fallback={null}>
          <ViewControls
            locale={view.locale}
            role={view.role}
            basePath="/remediation"
          />
        </Suspense>

        <RemediationSummary presentation={presentation} />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RemediationTable
              presentation={presentation}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
          <aside className="space-y-6">
            <WhatsNextPanel
              locale={view.locale}
              isSummaryView={view.isSummaryView}
              pendingActions={view.pendingActions}
              summaryHint={uiLabel("remediationSummaryHint", view.locale)}
            />
            <RemediationDetailPanel
              presentation={presentation}
              selectedId={selectedId}
            />
          </aside>
        </div>
      </main>
    </div>
  );
}
