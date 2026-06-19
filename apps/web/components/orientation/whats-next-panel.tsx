import type { DashboardView } from "@eqa/workflows";
import { ArrowRight, ListTodo } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { uiLabel } from "@/lib/ui-labels";

interface WhatsNextPanelProps {
  view: DashboardView;
}

const PRIORITY_VARIANT = {
  high: "red",
  medium: "amber",
  low: "secondary",
} as const;

export function WhatsNextPanel({ view }: WhatsNextPanelProps): React.ReactNode {
  const locale = view.locale;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListTodo className="h-4 w-4" aria-hidden />
          {uiLabel("whatsNext", locale)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {view.isSummaryView && (
          <p className="text-xs text-muted-foreground">
            {uiLabel("summaryHint", locale)}
          </p>
        )}

        {view.pendingActions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {uiLabel("whatsNextEmpty", locale)}
          </p>
        ) : (
          <ul className="space-y-2">
            {view.pendingActions.map((action) => (
              <li
                key={action.id}
                className="flex items-start justify-between gap-2 rounded-md border bg-background p-3 text-sm"
              >
                <div className="flex items-start gap-2">
                  <ArrowRight
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span>{action.label}</span>
                </div>
                <Badge variant={PRIORITY_VARIANT[action.priority]}>
                  {action.count}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
