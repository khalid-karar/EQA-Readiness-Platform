import type { DashboardView } from "@eqa/workflows";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { uiLabel } from "@/lib/ui-labels";

interface ReadinessIndicatorProps {
  view: DashboardView;
}

const LEVEL_PILL = {
  green: "conformant",
  amber: "partial",
  red: "gap",
} as const;

export function ReadinessIndicator({
  view,
}: ReadinessIndicatorProps): React.ReactNode {
  const locale = view.locale;
  const { overallReadiness } = view;
  const pillVariant = LEVEL_PILL[overallReadiness.level];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{uiLabel("readinessTitle", locale)}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div
            className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full bg-brand-gold text-brand-navy shadow-md ring-4 ring-brand-gold/25"
            role="img"
            aria-label={`${overallReadiness.label}: ${overallReadiness.score}%`}
          >
            <span className="text-3xl font-bold tabular-nums">
              {overallReadiness.score}%
            </span>
          </div>
          <div className="space-y-2">
            <StatusPill variant={pillVariant} className="text-sm">
              {overallReadiness.label}
            </StatusPill>
            <p className="text-sm text-muted-foreground">
              {uiLabel("readinessHint", locale)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
