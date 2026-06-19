"use client";

import type { DashboardView, ItemStatus } from "@eqa/workflows";
import { useRouter, useSearchParams } from "next/navigation";
import type { PresentedHeatMapCell } from "@/lib/present-dashboard";
import { StatusBadge } from "@/components/orientation/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { uiLabel } from "@/lib/ui-labels";
import { uxStatusLevel } from "@/lib/status-level";

type DashboardRole = DashboardView["role"];

const ROLE_OPTIONS: {
  value: DashboardRole;
  labelEn: string;
  labelAr: string;
}[] = [
  { value: "cae", labelEn: "CAE", labelAr: "الرئيس التنفيذي للتدقيق" },
  { value: "audit_staff", labelEn: "Audit Staff", labelAr: "فريق التدقيق" },
  { value: "board", labelEn: "Board", labelAr: "المجلس" },
];

interface DemoControlsProps {
  locale: DashboardView["locale"];
  role: DashboardRole;
}

export function DemoControls({
  locale,
  role,
}: DemoControlsProps): React.ReactNode {
  const router = useRouter();
  const searchParams = useSearchParams();

  function navigate(next: {
    locale?: DashboardView["locale"];
    role?: DashboardRole;
  }): void {
    const params = new URLSearchParams(searchParams.toString());
    if (next.locale) params.set("locale", next.locale);
    if (next.role) params.set("role", next.role);
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
      <span className="text-muted-foreground">
        {uiLabel("demoNote", locale)}
      </span>
      <Separator orientation="vertical" className="hidden h-6 md:block" />
      <div className="flex items-center gap-2">
        <span className="font-medium">{uiLabel("locale", locale)}:</span>
        <Button
          size="sm"
          variant={locale === "en" ? "default" : "outline"}
          onClick={() => navigate({ locale: "en" })}
        >
          EN
        </Button>
        <Button
          size="sm"
          variant={locale === "ar" ? "default" : "outline"}
          onClick={() => navigate({ locale: "ar" })}
        >
          AR
        </Button>
      </div>
      <Separator orientation="vertical" className="hidden h-6 md:block" />
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{uiLabel("viewAs", locale)}:</span>
        {ROLE_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            size="sm"
            variant={role === opt.value ? "default" : "outline"}
            onClick={() => navigate({ role: opt.value })}
          >
            {locale === "ar" ? opt.labelAr : opt.labelEn}
          </Button>
        ))}
      </div>
    </div>
  );
}

interface StandardDetailPanelProps {
  cell: PresentedHeatMapCell | null;
  view: DashboardView;
  statusLabels: Readonly<Record<ItemStatus, string>>;
}

export function StandardDetailPanel({
  cell,
  view,
  statusLabels,
}: StandardDetailPanelProps): React.ReactNode {
  if (!cell) return null;

  const locale = view.locale;
  const heatCell = view.heatMap
    .flatMap((d) => d.principles)
    .flatMap((p) => p.standards)
    .find((s) => s.standardNumber === cell.standardNumber);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {uiLabel("standardDetail", locale)}
        </CardTitle>
        <p className="text-sm font-medium">
          {cell.standardNumber} — {cell.standardTitle}
        </p>
        <p className="text-xs text-muted-foreground">
          {cell.domainNumber} › {cell.principleNumber}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
            {uiLabel("questionItems", locale)}
          </p>
          {heatCell && (
            <StatusBadge
              status={heatCell.dominantStatus}
              label={cell.statusLabel}
              level={uxStatusLevel(heatCell.dominantStatus)}
            />
          )}
          {!view.isSummaryView && heatCell?.statusBreakdown && (
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {Object.entries(heatCell.statusBreakdown)
                .filter(([, count]) => (count ?? 0) > 0)
                .map(([status, count]) => (
                  <li key={status} className="flex items-center gap-2">
                    <StatusBadge
                      status={status as ItemStatus}
                      label={statusLabels[status as ItemStatus]}
                      level={uxStatusLevel(status as ItemStatus)}
                    />
                    <span>× {count}</span>
                  </li>
                ))}
            </ul>
          )}
        </div>

        {heatCell?.conformance && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
              {uiLabel("wpConformance", locale)}
            </p>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <Stat
                label={uiLabel("conforms", locale)}
                value={heatCell.conformance.conforms}
              />
              <Stat
                label={uiLabel("gaps", locale)}
                value={heatCell.conformance.doesNotConform}
              />
              <Stat
                label={uiLabel("unreviewed", locale)}
                value={heatCell.conformance.unreviewed}
              />
              <Stat
                label={uiLabel("total", locale)}
                value={heatCell.conformance.totalItems}
              />
            </dl>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}): React.ReactNode {
  return (
    <div className="rounded border bg-background p-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold">{value}</dd>
    </div>
  );
}
