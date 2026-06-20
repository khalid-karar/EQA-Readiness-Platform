"use client";

import type { DashboardView, ItemStatus } from "@eqa/workflows";
import type { PresentedHeatMapCell } from "@/lib/present-dashboard";
import { StatusPill, readinessVariantFromLevel } from "@/components/ui/status-pill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { uiLabel } from "@/lib/ui-labels";
import { uxStatusLevel } from "@/lib/status-level";

interface StandardDetailPanelProps {
  cell: PresentedHeatMapCell | null;
  view: DashboardView;
  statusLabels: Readonly<Record<ItemStatus, string>>;
}

export function StandardDetailPanel({
  cell,
  view,
  statusLabels,
}: StandardDetailPanelProps): React.ReactNode {
  if (!cell) return null;

  const locale = view.locale;
  const heatCell = view.heatMap
    .flatMap((d) => d.principles)
    .flatMap((p) => p.standards)
    .find((s) => s.standardNumber === cell.standardNumber);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {uiLabel("standardDetail", locale)}
        </CardTitle>
        <p className="text-sm font-medium">
          {cell.standardNumber} — {cell.standardTitle}
        </p>
        <p className="text-xs text-muted-foreground">
          {cell.domainNumber} › {cell.principleNumber}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
            {uiLabel("questionItems", locale)}
          </p>
          {heatCell && (
            <StatusPill
              variant={readinessVariantFromLevel(
                uxStatusLevel(heatCell.dominantStatus),
              )}
            >
              {cell.statusLabel}
            </StatusPill>
          )}
          {!view.isSummaryView && heatCell?.statusBreakdown && (
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {Object.entries(heatCell.statusBreakdown)
                .filter(([, count]) => (count ?? 0) > 0)
                .map(([status, count]) => (
                  <li key={status} className="flex items-center gap-2">
                    <StatusPill
                      variant={readinessVariantFromLevel(
                        uxStatusLevel(status as ItemStatus),
                      )}
                      size="sm"
                    >
                      {statusLabels[status as ItemStatus]}
                    </StatusPill>
                    <span>× {count}</span>
                  </li>
                ))}
            </ul>
          )}
        </div>

        {heatCell?.conformance && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
              {uiLabel("wpConformance", locale)}
            </p>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <Stat
                label={uiLabel("conforms", locale)}
                value={heatCell.conformance.conforms}
              />
              <Stat
                label={uiLabel("gaps", locale)}
                value={heatCell.conformance.doesNotConform}
              />
              <Stat
                label={uiLabel("unreviewed", locale)}
                value={heatCell.conformance.unreviewed}
              />
              <Stat
                label={uiLabel("total", locale)}
                value={heatCell.conformance.totalItems}
              />
            </dl>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}): React.ReactNode {
  return (
    <div className="rounded border bg-background p-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold">{value}</dd>
    </div>
  );
}
