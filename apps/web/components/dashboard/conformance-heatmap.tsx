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
import { cn } from "@/lib/utils";
import { uiLabel } from "@/lib/ui-labels";

const CELL_BG = {
  green: "bg-readiness-green hover:bg-readiness-green/90",
  amber: "bg-readiness-amber hover:bg-readiness-amber/90",
  red: "bg-readiness-red hover:bg-readiness-red/90",
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
        <CardTitle className="text-base">
          {uiLabel("heatMapTitle", locale)}
        </CardTitle>
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
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => onSelect(cell)}
          className={cn(
            "rounded-md p-3 text-left text-sm text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            CELL_BG[cell.readinessLevel],
            isSelected && "ring-2 ring-offset-2 ring-foreground",
          )}
        >
          <div className="font-semibold">
            {cell.standardNumber} — {cell.standardTitle}
          </div>
          <div className="mt-1 text-xs opacity-90">{cell.readinessScore}%</div>
          <div className="mt-2 text-xs font-medium opacity-95">
            {cell.statusLabel}
          </div>
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
