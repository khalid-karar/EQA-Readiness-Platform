"use client";

import { useState } from "react";
import type { RemediationPresentation } from "@/lib/present-remediation";
import { WhatsNextPanel } from "@/components/orientation/whats-next-panel";
import { useSyncShellMeta } from "@/components/shell/use-sync-shell-meta";
import { DEFAULT_TENANT_NAME } from "@/lib/nav-config";
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

  const selectedRow = view.items.find((i) => i.remediationId === selectedId);
  const location = selectedRow
    ? `${selectedRow.standardNumber} — ${selectedRow.standardTitle}`
    : uiLabel("remediationLocation", view.locale);

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
    </div>
  );
}
