import type { EvidencePackPresentation } from "@/lib/present-evidence-pack";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { uiLabel } from "@/lib/ui-labels";

export function EvidencePackSummaryCard({
  presentation,
}: {
  presentation: EvidencePackPresentation;
}): React.ReactNode {
  const locale = presentation.locale;
  const rows = [
    {
      label: uiLabel("packStandards", locale),
      value: String(presentation.standardCount),
    },
    {
      label: uiLabel("packEvidenceRefs", locale),
      value: String(presentation.evidenceReferenceCount),
    },
    {
      label: uiLabel("packRawBundled", locale),
      value: String(presentation.bundledFileCount),
    },
    {
      label: uiLabel("packReadiness", locale),
      value: `${presentation.readinessScore}% — ${presentation.readinessLabel}`,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {uiLabel("packSummaryTitle", locale)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid gap-2 sm:grid-cols-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="rounded-md border bg-muted/20 px-3 py-2"
            >
              <dt className="text-xs text-muted-foreground">{row.label}</dt>
              <dd className="text-sm font-semibold">{row.value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">
          {uiLabel("packNoRawHint", locale)}
        </p>
      </CardContent>
    </Card>
  );
}
