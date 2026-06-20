"use client";

import type { DashboardView } from "@eqa/workflows";
import type { PresentedHeatMapCell } from "@/lib/present-dashboard";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  StatusPill,
  readinessVariantFromLevel,
} from "@/components/ui/status-pill";
import { cn } from "@/lib/utils";
import { uiLabel } from "@/lib/ui-labels";

const CELL_BORDER = {
  green: "border-s-readiness-conformant",
  amber: "border-s-readiness-partial",
  red: "border-s-readiness-gap",
} as const;

interface ConformanceHeatMapProps {
  view: DashboardView;
  cellPresentation: Readonly<Record<string, PresentedHeatMapCell>>;
  selectedStandard: string | null;
  onSelect: (cell: PresentedHeatMapCell) => void;
}

export function ConformanceHeatMap({
  view,
  cellPresentation,
  selectedStandard,
  onSelect,
}: ConformanceHeatMapProps): React.ReactNode {
  const locale = view.locale;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{uiLabel("heatMapTitle", locale)}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {uiLabel("heatMapSubtitle", locale)}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <TooltipProvider>
          {view.heatMap.map((domain) => (
            <section key={domain.id} className="space-y-3">
              <h3 className="text-sm font-semibold">
                {domain.number}. {domain.title}
              </h3>
              {domain.principles.map((principle) => (
                <div key={principle.id} className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    {principle.number}. {principle.title}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {principle.standards.map((cell) => {
                      const presented = cellPresentation[cell.standardNumber];
                      if (!presented) return null;
                      return (
                        <HeatMapCellButton
                          key={cell.standardNumber}
                          cell={presented}
                          isSelected={selectedStandard === cell.standardNumber}
                          onSelect={onSelect}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}

function HeatMapCellButton({
  cell,
  isSelected,
  onSelect,
}: {
  cell: PresentedHeatMapCell;
  isSelected: boolean;
  onSelect: (cell: PresentedHeatMapCell) => void;
}): React.ReactNode {
  const pillVariant = readinessVariantFromLevel(cell.readinessLevel);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => onSelect(cell)}
          aria-pressed={isSelected}
          aria-label={`${cell.standardNumber} ${cell.standardTitle}, ${cell.readinessScore}% ${cell.statusLabel}`}
          className={cn(
            "rounded-md border border-border border-s-4 bg-surface p-3 text-start text-sm shadow-sm motion-safe transition",
            "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            CELL_BORDER[cell.readinessLevel],
            isSelected && "ring-2 ring-brand-gold ring-offset-2",
          )}
        >
          <div className="font-semibold text-foreground">
            {cell.standardNumber} — {cell.standardTitle}
          </div>
          <div className="mt-1 text-xs tabular-nums text-muted-foreground">
            {cell.readinessScore}%
          </div>
          <StatusPill variant={pillVariant} size="sm" className="mt-2">
            {cell.statusLabel}
          </StatusPill>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs space-y-1">
        {cell.tooltipLines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </TooltipContent>
    </Tooltip>
  );
}
