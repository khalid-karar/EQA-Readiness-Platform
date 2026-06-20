import type { Locale } from "@eqa/content";
import { ArrowRight, ListTodo } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { uiLabel } from "@/lib/ui-labels";

export interface PendingActionView {
  readonly id: string;
  readonly count: number;
  readonly label: string;
  readonly priority: "high" | "medium" | "low";
}

interface WhatsNextPanelProps {
  locale: Locale;
  isSummaryView: boolean;
  pendingActions: readonly PendingActionView[];
  summaryHint?: string;
}

const PRIORITY_VARIANT = {
  high: "gap",
  medium: "partial",
  low: "neutral",
} as const;

export function WhatsNextPanel({
  locale,
  isSummaryView,
  pendingActions,
  summaryHint,
}: WhatsNextPanelProps): React.ReactNode {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListTodo className="h-4 w-4" aria-hidden />
          {uiLabel("whatsNext", locale)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isSummaryView && (
          <p className="text-xs text-muted-foreground">
            {summaryHint ?? uiLabel("summaryHint", locale)}
          </p>
        )}

        {pendingActions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {uiLabel("whatsNextEmpty", locale)}
          </p>
        ) : (
          <ul className="space-y-2">
            {pendingActions.map((action) => (
              <li
                key={action.id}
                className="flex items-start justify-between gap-2 rounded-md border bg-background p-3 text-sm"
              >
                <div className="flex items-start gap-2">
                  <ArrowRight
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180"
                    aria-hidden
                  />
                  <span>{action.label}</span>
                </div>
                <StatusPill
                  variant={PRIORITY_VARIANT[action.priority]}
                  size="sm"
                  className="tabular-nums"
                >
                  {action.count}
                </StatusPill>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
