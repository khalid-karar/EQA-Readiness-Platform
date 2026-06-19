import type { ItemStatus } from "@eqa/workflows";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { uiLabel } from "@/lib/ui-labels";
import { remediationTrackLabel } from "@/lib/remediation-display";
import type { RemediationPresentation } from "@/lib/present-remediation";
import { StatusBadge } from "@/components/orientation/status-badge";
import { uxStatusLevel } from "@/lib/status-level";
import { cn } from "@/lib/utils";

interface RemediationSummaryProps {
  presentation: RemediationPresentation;
}

export function RemediationSummary({
  presentation,
}: RemediationSummaryProps): React.ReactNode {
  const { view } = presentation;
  const locale = view.locale;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {uiLabel("openGaps", locale)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{view.openCount}</p>
        </CardContent>
      </Card>
      <Card
        className={view.overdueCount > 0 ? "ring-2 ring-readiness-red/40" : ""}
      >
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            {view.overdueCount > 0 && (
              <AlertTriangle
                className="h-4 w-4 text-readiness-red"
                aria-hidden
              />
            )}
            {uiLabel("overdue", locale)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={cn(
              "text-3xl font-bold",
              view.overdueCount > 0 && "text-readiness-red",
            )}
          >
            {view.overdueCount}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

interface RemediationTableProps {
  presentation: RemediationPresentation;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function isClosedStatus(status: ItemStatus): boolean {
  return status === "closed_ready" || status === "not_applicable";
}

export function RemediationTable({
  presentation,
  selectedId,
  onSelect,
}: RemediationTableProps): React.ReactNode {
  const { view, statusLabels } = presentation;
  const locale = view.locale;
  const oversight = view.isSummaryView;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {uiLabel("remediationTitle", locale)}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {oversight
            ? uiLabel("boardRemediationTableHint", locale)
            : uiLabel("selectRowHint", locale)}
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {oversight ? (
          <table className="w-full min-w-[400px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-muted-foreground">
                <th className="pb-2 pe-4">{uiLabel("standard", locale)}</th>
                <th className="pb-2 pe-4">{uiLabel("status", locale)}</th>
                <th className="pb-2">{uiLabel("schedule", locale)}</th>
              </tr>
            </thead>
            <tbody>
              {view.items.map((row) => {
                const closed = isClosedStatus(row.itemStatus);
                return (
                  <tr
                    key={row.remediationId}
                    className={cn(
                      "cursor-pointer border-b transition hover:bg-muted/50",
                      selectedId === row.remediationId && "bg-muted",
                      row.isOverdue &&
                        !closed &&
                        "border-l-4 border-l-readiness-red",
                    )}
                    onClick={() => onSelect(row.remediationId)}
                  >
                    <td className="py-3 pe-4 align-top font-medium">
                      {row.standardNumber} — {row.standardTitle}
                    </td>
                    <td className="py-3 pe-4 align-top">
                      <StatusBadge
                        status={row.itemStatus}
                        label={statusLabels[row.itemStatus]}
                        level={uxStatusLevel(row.itemStatus)}
                      />
                    </td>
                    <td className="py-3 align-top">
                      <Badge
                        variant={
                          closed
                            ? "green"
                            : row.isOverdue
                              ? "red"
                              : "secondary"
                        }
                      >
                        {remediationTrackLabel(locale, row.isOverdue, closed)}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-muted-foreground">
                <th className="pb-2 pe-4">{uiLabel("standard", locale)}</th>
                <th className="pb-2 pe-4">{uiLabel("action", locale)}</th>
                <th className="pb-2 pe-4">{uiLabel("owner", locale)}</th>
                <th className="pb-2 pe-4">{uiLabel("targetDate", locale)}</th>
                <th className="pb-2">{uiLabel("status", locale)}</th>
              </tr>
            </thead>
            <tbody>
              {view.items.map((row) => (
                <tr
                  key={row.remediationId}
                  className={cn(
                    "cursor-pointer border-b transition hover:bg-muted/50",
                    selectedId === row.remediationId && "bg-muted",
                    row.isOverdue && "border-l-4 border-l-readiness-red",
                  )}
                  onClick={() => onSelect(row.remediationId)}
                >
                  <td className="py-3 pe-4 align-top">
                    <div className="font-medium">
                      {row.standardNumber} — {row.standardTitle}
                    </div>
                    {row.isOverdue && (
                      <Badge variant="red" className="mt-1">
                        {row.daysOverdue} {uiLabel("daysOverdue", locale)}
                      </Badge>
                    )}
                  </td>
                  <td className="py-3 pe-4 align-top">{row.action}</td>
                  <td className="py-3 pe-4 align-top">{row.owner}</td>
                  <td className="py-3 pe-4 align-top">{row.targetDate}</td>
                  <td className="py-3 align-top">
                    <StatusBadge
                      status={row.itemStatus}
                      label={statusLabels[row.itemStatus]}
                      level={uxStatusLevel(row.itemStatus)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

interface RemediationDetailPanelProps {
  presentation: RemediationPresentation;
  selectedId: string | null;
}

export function RemediationDetailPanel({
  presentation,
  selectedId,
}: RemediationDetailPanelProps): React.ReactNode {
  const { view, statusLabels } = presentation;
  const locale = view.locale;
  const row = view.items.find((i) => i.remediationId === selectedId);
  if (!row) return null;

  const closed = isClosedStatus(row.itemStatus);
  const oversight = view.isSummaryView;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {row.standardNumber} — {row.standardTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">
            {uiLabel("status", locale)}
          </p>
          <StatusBadge
            status={row.itemStatus}
            label={statusLabels[row.itemStatus as ItemStatus]}
            level={uxStatusLevel(row.itemStatus)}
          />
        </div>

        {oversight ? (
          <>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                {uiLabel("schedule", locale)}
              </p>
              <Badge
                variant={
                  closed ? "green" : row.isOverdue ? "red" : "secondary"
                }
              >
                {remediationTrackLabel(locale, row.isOverdue, closed)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {uiLabel("boardRemediationDetailHint", locale)}
            </p>
          </>
        ) : (
          <>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                {uiLabel("action", locale)}
              </p>
              <p>{row.action}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  {uiLabel("owner", locale)}
                </p>
                <p className="font-medium">{row.owner}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  {uiLabel("targetDate", locale)}
                </p>
                <p className="font-medium">{row.targetDate}</p>
              </div>
            </div>
            {row.isOverdue && !closed && (
              <div className="flex items-center gap-2 rounded-md border border-readiness-red/30 bg-readiness-red/10 p-3 text-readiness-red">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                <span>
                  {row.daysOverdue} {uiLabel("daysOverdue", locale)}
                </span>
              </div>
            )}
            {closed && (
              <div className="flex items-center gap-2 text-readiness-green">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                <span>{uiLabel("closed", locale)}</span>
              </div>
            )}
            {!closed && (
              <p className="text-xs text-muted-foreground">
                {locale === "ar"
                  ? "يمكن للأدوار التشغيلية تحديث هذا البند عند ربط الواجهة بالخادم."
                  : "Operational roles will update this item when the UI is wired to the API."}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
