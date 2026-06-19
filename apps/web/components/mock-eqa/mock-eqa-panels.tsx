import type { MockEqaPresentation } from "@/lib/present-mock-eqa";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { uiLabel } from "@/lib/ui-labels";

interface MockEqaPanelsProps {
  presentation: MockEqaPresentation;
  selectedStandard: string | null;
  onSelectStandard: (standardNumber: string | null) => void;
}

const LEVEL_STYLES = {
  green: {
    ring: "ring-readiness-green/40",
    bg: "bg-readiness-green",
    text: "text-readiness-green",
    badge: "bg-readiness-green/15 text-readiness-green",
  },
  amber: {
    ring: "ring-readiness-amber/40",
    bg: "bg-readiness-amber",
    text: "text-readiness-amber",
    badge: "bg-readiness-amber/15 text-readiness-amber",
  },
  red: {
    ring: "ring-readiness-red/40",
    bg: "bg-readiness-red",
    text: "text-readiness-red",
    badge: "bg-readiness-red/15 text-readiness-red",
  },
} as const;

export function MockEqaOverallCard({
  presentation,
}: {
  presentation: MockEqaPresentation;
}): React.ReactNode {
  const locale = presentation.view.locale;
  const styles = LEVEL_STYLES[presentation.overallLevel];

  return (
    <Card className={cn("ring-2", styles.ring)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {uiLabel("mockEqaOverallTitle", locale)}
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
            aria-label={`${presentation.overallLabel}: ${presentation.overallScore}%`}
          >
            <span className="text-3xl font-bold">
              {presentation.overallScore}%
            </span>
          </div>
          <div className="space-y-2">
            <p className={cn("text-2xl font-semibold", styles.text)}>
              {presentation.overallLabel}
            </p>
            <p className="text-sm text-muted-foreground">
              {uiLabel("mockEqaOverallHint", locale)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MockEqaDomainBreakdown({
  presentation,
  selectedStandard,
  onSelectStandard,
}: MockEqaPanelsProps): React.ReactNode {
  const locale = presentation.view.locale;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">
          {uiLabel("mockEqaBreakdownTitle", locale)}
        </h2>
        <p className="text-sm text-muted-foreground">
          {uiLabel("mockEqaBreakdownSubtitle", locale)}
        </p>
      </div>

      {presentation.domains.map((domain) => {
        const domainStyles = LEVEL_STYLES[domain.ratingLevel];
        return (
          <Card key={domain.domainNumber} className="overflow-hidden">
            <CardHeader className="border-b bg-muted/30 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">
                  {domain.domainNumber} — {domain.domainTitle}
                </CardTitle>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-sm font-semibold",
                    domainStyles.badge,
                  )}
                >
                  {domain.ratingScore}% · {domain.ratingLabel}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {domain.standards.map((std) => {
                  const stdStyles = LEVEL_STYLES[std.ratingLevel];
                  const selected = selectedStandard === std.standardNumber;
                  return (
                    <button
                      key={std.standardNumber}
                      type="button"
                      onClick={() =>
                        onSelectStandard(
                          selected ? null : std.standardNumber,
                        )
                      }
                      className={cn(
                        "flex w-full flex-col gap-2 px-4 py-3 text-start transition-colors hover:bg-muted/40",
                        selected && "bg-muted/50",
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">
                          {std.standardNumber} — {std.standardTitle}
                        </span>
                        <span
                          className={cn(
                            "rounded px-2 py-0.5 text-xs font-semibold",
                            stdStyles.badge,
                          )}
                        >
                          {std.ratingScore}% · {std.ratingLabel}
                        </span>
                      </div>
                      {std.drivingGaps.length > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {std.drivingGaps.length}{" "}
                          {uiLabel("mockEqaDrivingGaps", locale)}
                        </p>
                      ) : (
                        <p className="text-xs text-readiness-green">
                          {uiLabel("mockEqaNoGaps", locale)}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function MockEqaGapDetailPanel({
  presentation,
  selectedStandard,
}: {
  presentation: MockEqaPresentation;
  selectedStandard: string | null;
}): React.ReactNode {
  const locale = presentation.view.locale;
  const std = presentation.domains
    .flatMap((d) => d.standards)
    .find((s) => s.standardNumber === selectedStandard);

  if (!std) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {uiLabel("mockEqaGapDetailTitle", locale)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {uiLabel("mockEqaSelectStandard", locale)}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {uiLabel("mockEqaGapDetailTitle", locale)}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {std.standardNumber} — {std.standardTitle}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {std.drivingGaps.length === 0 ? (
          <p className="text-sm text-readiness-green">
            {uiLabel("mockEqaNoGaps", locale)}
          </p>
        ) : (
          <ul className="space-y-2">
            {std.drivingGaps.map((gap) => (
              <li
                key={gap.id}
                className="rounded-md border bg-muted/20 px-3 py-2 text-sm"
              >
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  {gap.source.replace(/_/g, " ")}
                </span>
                <p>{gap.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
