import type { DashboardView } from "@eqa/workflows";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { uiLabel } from "@/lib/ui-labels";

interface ReadinessIndicatorProps {
  view: DashboardView;
}

const LEVEL_STYLES = {
  green: {
    ring: "ring-readiness-green/40",
    bg: "bg-readiness-green",
    text: "text-readiness-green",
  },
  amber: {
    ring: "ring-readiness-amber/40",
    bg: "bg-readiness-amber",
    text: "text-readiness-amber",
  },
  red: {
    ring: "ring-readiness-red/40",
    bg: "bg-readiness-red",
    text: "text-readiness-red",
  },
} as const;

export function ReadinessIndicator({
  view,
}: ReadinessIndicatorProps): React.ReactNode {
  const locale = view.locale;
  const { overallReadiness } = view;
  const styles = LEVEL_STYLES[overallReadiness.level];

  return (
    <Card className={cn("ring-2", styles.ring)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {uiLabel("readinessTitle", locale)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div
            className={cn(
              "flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full text-white",
              styles.bg,
            )}
            role="img"
            aria-label={`${overallReadiness.label}: ${overallReadiness.score}%`}
          >
            <span className="text-3xl font-bold">
              {overallReadiness.score}%
            </span>
          </div>
          <div className="space-y-2">
            <p className={cn("text-2xl font-semibold", styles.text)}>
              {overallReadiness.label}
            </p>
            <p className="text-sm text-muted-foreground">
              {uiLabel("readinessHint", locale)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
