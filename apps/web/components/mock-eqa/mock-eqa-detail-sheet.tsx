"use client";

import type { PresentedStandardRow } from "@/lib/present-mock-eqa";
import {
  SideSheet,
  SideSheetBody,
  SideSheetCloseButton,
  SideSheetContent,
  detailPanelSide,
  SideSheetDescription,
  SideSheetHeader,
  SideSheetTitle,
} from "@/components/ui/side-sheet";
import { StatusPill, readinessVariantFromLevel } from "@/components/ui/status-pill";
import { gapSourceLabel, uiLabel } from "@/lib/ui-labels";

interface MockEqaDetailSheetProps {
  row: PresentedStandardRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: "en" | "ar";
}

export function MockEqaDetailSheet({
  row,
  open,
  onOpenChange,
  locale,
}: MockEqaDetailSheetProps): React.ReactNode {
  if (!row) return null;

  return (
    <SideSheet open={open} onOpenChange={onOpenChange}>
      <SideSheetContent
        side={detailPanelSide(locale)}
        aria-describedby="mock-eqa-sheet-desc"
      >
        <SideSheetHeader>
          <div className="min-w-0 space-y-1 pe-2">
            <SideSheetTitle>
              {row.standardNumber} — {row.standardTitle}
            </SideSheetTitle>
            <SideSheetDescription id="mock-eqa-sheet-desc">
              {uiLabel("mockEqaDetailSubtitle", locale)} · {row.domainNumber} —{" "}
              {row.domainTitle}
            </SideSheetDescription>
          </div>
          <SideSheetCloseButton aria-label={uiLabel("closePanel", locale)} />
        </SideSheetHeader>

        <SideSheetBody className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill variant={readinessVariantFromLevel(row.ratingLevel)}>
              {row.ratingScore}% · {row.ratingLabel}
            </StatusPill>
            <StatusPill variant="neutral" size="sm">
              {uiLabel("mockEqaSimulationBadge", locale)}
            </StatusPill>
          </div>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">
              {uiLabel("mockEqaGapDetailTitle", locale)}
            </h3>
            {row.drivingGaps.length === 0 ? (
              <p className="text-sm text-readiness-conformant">
                {uiLabel("mockEqaNoGaps", locale)}
              </p>
            ) : (
              <ul className="space-y-2">
                {row.drivingGaps.map((gap) => (
                  <li
                    key={gap.id}
                    className="rounded-md border bg-muted/20 px-3 py-2 text-sm"
                  >
                    <span className="text-xs font-medium uppercase text-muted-foreground">
                      {gapSourceLabel(gap.source, locale)}
                    </span>
                    <p>{gap.summary}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </SideSheetBody>
      </SideSheetContent>
    </SideSheet>
  );
}
