import type { DashboardView } from "@eqa/workflows";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  progressCompleteLabel,
  progressNotStartedLabel,
  progressRemainingLabel,
  progressStartedLabel,
  uiLabel,
} from "@/lib/ui-labels";

interface ProgressIndicatorProps {
  view: DashboardView;
}

export function ProgressIndicator({
  view,
}: ProgressIndicatorProps): React.ReactNode {
  const locale = view.locale;
  const { progress } = view;

  const startedLabel = progressStartedLabel(
    locale,
    progress.startedCount,
    progress.totalStandards,
  );
  const completeLabel = progressCompleteLabel(
    locale,
    progress.completedCount,
    progress.totalStandards,
    progress.percentComplete,
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {uiLabel("progressTitle", locale)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm font-medium">{startedLabel}</p>
        <Progress value={progress.percentComplete} aria-label={completeLabel} />
        <p className="text-sm text-muted-foreground">{completeLabel}</p>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {progress.inProgressCount > 0 && (
            <span>
              {progressRemainingLabel(locale, progress.inProgressCount)}
            </span>
          )}
          {progress.notStartedCount > 0 && (
            <span>
              {progressNotStartedLabel(locale, progress.notStartedCount)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
