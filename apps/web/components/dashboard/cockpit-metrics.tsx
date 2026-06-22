import type { DashboardView } from "@eqa/workflows";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusPill } from "@/components/ui/status-pill";
import { uiLabel } from "@/lib/ui-labels";
import {
  progressCompleteLabel,
  progressStartedLabel,
} from "@/lib/ui-labels";

interface CockpitMetricsProps {
  view: DashboardView;
}

const LEVEL_PILL = {
  green: "conformant",
  amber: "partial",
  red: "gap",
} as const;

export function CockpitMetrics({ view }: CockpitMetricsProps): React.ReactNode {
  const locale = view.locale;
  const { overallReadiness, progress } = view;
  const readinessVariant = LEVEL_PILL[overallReadiness.level];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                {uiLabel("cockpitIndicativeReadiness", locale)}
              </p>
              <p className="text-xs text-muted-foreground">
                {uiLabel("readinessHint", locale)}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div
                className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full bg-brand-gold text-brand-navy shadow-md ring-4 ring-brand-gold/25"
                role="img"
                aria-label={`${overallReadiness.label}: ${overallReadiness.score}%`}
              >
                <span className="text-2xl font-bold tabular-nums">
                  {overallReadiness.score}%
                </span>
              </div>
              <StatusPill variant={readinessVariant} className="text-sm">
                {overallReadiness.label}
              </StatusPill>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                {uiLabel("cockpitCompletion", locale)}
              </p>
              <p className="text-xs text-muted-foreground">
                {uiLabel("progressMetricHint", locale)}
              </p>
            </div>
            <p className="text-sm font-medium">
              {progressStartedLabel(
                locale,
                progress.startedCount,
                progress.totalStandards,
              )}
            </p>
            <Progress
              value={progress.percentComplete}
              aria-label={progressCompleteLabel(
                locale,
                progress.completedCount,
                progress.totalStandards,
                progress.percentComplete,
              )}
            />
            <p className="text-2xl font-bold tabular-nums">
              {progress.percentComplete}%
            </p>
            <p className="text-sm text-muted-foreground">
              {progressCompleteLabel(
                locale,
                progress.completedCount,
                progress.totalStandards,
                progress.percentComplete,
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card
        className="border-readiness-unreviewed/30 bg-readiness-unreviewed-bg/30"
        data-testid="cockpit-readiness-disclaimer"
      >
        <CardContent className="pt-6 text-sm text-muted-foreground">
          {uiLabel("cockpitReadinessDisclaimer", locale)}
        </CardContent>
      </Card>
    </div>
  );
}
