import type { DashboardView, HeatMapCell } from "@eqa/workflows";
import { MapPin, UserCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { uiLabel } from "@/lib/ui-labels";

interface ContextBarProps {
  view: DashboardView;
  roleLabel: string;
  selectedCell: HeatMapCell | PresentedLocation | null;
}

interface PresentedLocation {
  readonly domainNumber: string;
  readonly principleNumber: string;
  readonly standardNumber: string;
  readonly standardTitle: string;
}

export function ContextBar({
  view,
  roleLabel,
  selectedCell,
}: ContextBarProps): React.ReactNode {
  const locale = view.locale;
  const location = selectedCell
    ? `${selectedCell.domainNumber} › ${selectedCell.principleNumber} › ${selectedCell.standardNumber} ${selectedCell.standardTitle}`
    : uiLabel("overview", locale);

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {uiLabel("assessment", locale)}
          </p>
          <h1 className="truncate text-lg font-semibold">
            {view.assessmentName}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden />
            <div>
              <span className="sr-only">{uiLabel("location", locale)}</span>
              <span className="font-medium text-foreground">{location}</span>
            </div>
          </div>

          <Separator orientation="vertical" className="hidden h-6 sm:block" />

          <div className="flex items-center gap-2">
            <UserCircle className="h-4 w-4 text-muted-foreground" aria-hidden />
            <div>
              <span className="sr-only">{uiLabel("role", locale)}</span>
              <span className="font-medium">{roleLabel}</span>
            </div>
            <Badge variant="secondary">
              {view.isSummaryView
                ? uiLabel("summaryView", locale)
                : uiLabel("detailView", locale)}
            </Badge>
          </div>
        </div>
      </div>
    </header>
  );
}
