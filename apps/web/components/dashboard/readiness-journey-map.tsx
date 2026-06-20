"use client";

import type { Locale } from "@eqa/content";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Flag } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  JourneyCheckpoint,
  JourneyCheckpointState,
  JourneyMapPresentation,
} from "@/lib/present-journey-map";
import { uiLabel } from "@/lib/ui-labels";
import { cn } from "@/lib/utils";

interface ReadinessJourneyMapProps {
  journeyMap: JourneyMapPresentation;
  locale: Locale;
}

const STATE_STYLES: Record<
  JourneyCheckpointState,
  { ring: string; node: string; label: string }
> = {
  cleared: {
    ring: "ring-brand-gold/50",
    node: "bg-brand-gold text-brand-navy border-brand-gold",
    label: "text-brand-gold",
  },
  "in-progress": {
    ring: "ring-readiness-partial/40",
    node: "bg-readiness-partial-bg text-readiness-partial border-readiness-partial/40",
    label: "text-readiness-partial",
  },
  "not-started": {
    ring: "ring-readiness-unreviewed/30",
    node: "bg-readiness-unreviewed-bg text-readiness-unreviewed border-border",
    label: "text-readiness-unreviewed",
  },
  blocked: {
    ring: "ring-readiness-gap/40",
    node: "bg-readiness-gap-bg text-readiness-gap border-readiness-gap/40",
    label: "text-readiness-gap",
  },
};

function stateAriaLabel(
  state: JourneyCheckpointState,
  locale: Locale,
): string {
  const key =
    state === "cleared"
      ? "journeyStateCleared"
      : state === "in-progress"
        ? "journeyStateInProgress"
        : state === "not-started"
          ? "journeyStateNotStarted"
          : "journeyStateBlocked";
  return uiLabel(key, locale);
}

export function ReadinessJourneyMap({
  journeyMap,
  locale,
}: ReadinessJourneyMapProps): ReactNode {
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const suffix = query ? `?${query}` : "";
  const isRtl = locale === "ar";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>{uiLabel("journeyMapTitle", locale)}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {uiLabel("journeyMapSubtitle", locale)}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div aria-hidden="true">
          <JourneyMapVisual
            journeyMap={journeyMap}
            locale={locale}
            isRtl={isRtl}
          />
        </div>
        <JourneyMapStepper
          journeyMap={journeyMap}
          locale={locale}
          suffix={suffix}
        />
      </CardContent>
    </Card>
  );
}

function JourneyMapVisual({
  journeyMap,
  locale,
  isRtl,
}: {
  journeyMap: JourneyMapPresentation;
  locale: Locale;
  isRtl: boolean;
}): ReactNode {
  const {
    checkpoints,
    pathFillPercent,
    finishPercent,
    finishLabelEn,
    finishLabelAr,
  } = journeyMap;

  return (
    <div className="relative px-2 pb-2">
      <div className="relative mx-4 mt-10 mb-6">
        <div
          className="absolute top-5 h-0.5 w-[calc(100%-2rem)] bg-muted"
          style={{
            left: isRtl ? undefined : "1rem",
            right: isRtl ? "1rem" : undefined,
          }}
        />
        <div
          className="absolute top-5 h-0.5 bg-brand-gold motion-safe transition-all"
          style={{
            width: `calc((100% - 2rem) * ${pathFillPercent / 100})`,
            left: isRtl ? undefined : "1rem",
            right: isRtl ? "1rem" : undefined,
          }}
        />
        <div
          className={cn(
            "relative flex items-start justify-between gap-1",
            isRtl && "flex-row-reverse",
          )}
        >
          {checkpoints.map((checkpoint) => (
            <JourneyNodeVisual
              key={checkpoint.id}
              checkpoint={checkpoint}
              locale={locale}
            />
          ))}
          <FinishNodeVisual
            percent={finishPercent}
            label={locale === "ar" ? finishLabelAr : finishLabelEn}
          />
        </div>
      </div>
    </div>
  );
}

function JourneyMapStepper({
  journeyMap,
  locale,
  suffix,
}: {
  journeyMap: JourneyMapPresentation;
  locale: Locale;
  suffix: string;
}): ReactNode {
  return (
    <nav aria-label={uiLabel("journeyStepperLabel", locale)}>
      <ol className="space-y-2">
        {journeyMap.checkpoints.map((checkpoint) => (
          <li key={checkpoint.id}>
            <CheckpointStepLink
              checkpoint={checkpoint}
              locale={locale}
              suffix={suffix}
            />
          </li>
        ))}
        <li
          className="flex flex-wrap items-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-2 text-sm"
          aria-label={
            locale === "ar"
              ? `${journeyMap.finishLabelAr}: ${journeyMap.finishPercent}%`
              : `${journeyMap.finishLabelEn}: ${journeyMap.finishPercent}%`
          }
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-gold/20 text-sm"
            aria-hidden
          >
            🏁
          </span>
          <span className="font-medium">
            {locale === "ar"
              ? journeyMap.finishLabelAr
              : journeyMap.finishLabelEn}
          </span>
          <span className="tabular-nums text-brand-gold font-semibold">
            {journeyMap.finishPercent}%
          </span>
        </li>
      </ol>
    </nav>
  );
}

function JourneyNodeVisual({
  checkpoint,
  locale,
}: {
  checkpoint: JourneyCheckpoint;
  locale: Locale;
}): ReactNode {
  const styles = STATE_STYLES[checkpoint.state];
  const label = locale === "ar" ? checkpoint.labelAr : checkpoint.labelEn;

  return (
    <div className="flex max-w-[5.5rem] flex-col items-center gap-1.5 text-center">
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full border-2 text-xs font-bold ring-2",
          styles.ring,
          styles.node,
        )}
      >
        {checkpoint.state === "cleared" ? (
          <Check className="h-4 w-4" aria-hidden />
        ) : (
          checkpoint.step
        )}
      </span>
      <span className="line-clamp-2 text-[0.65rem] font-medium leading-tight text-foreground">
        {label}
      </span>
      <span className={cn("text-[0.6rem] tabular-nums font-medium", styles.label)}>
        {checkpoint.percent}%
      </span>
    </div>
  );
}

function CheckpointStepLink({
  checkpoint,
  locale,
  suffix,
}: {
  checkpoint: JourneyCheckpoint;
  locale: Locale;
  suffix: string;
}): ReactNode {
  const styles = STATE_STYLES[checkpoint.state];
  const label = locale === "ar" ? checkpoint.labelAr : checkpoint.labelEn;
  const metric = locale === "ar" ? checkpoint.metricAr : checkpoint.metricEn;
  const stateLabel = stateAriaLabel(checkpoint.state, locale);

  return (
    <Link
      href={`${checkpoint.href}${suffix}`}
      className="flex flex-wrap items-center gap-2 rounded-md border bg-surface px-3 py-2 text-sm motion-safe transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`${label} — ${stateLabel}, ${metric}`}
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
          styles.node,
        )}
      >
        {checkpoint.state === "cleared" ? (
          <Check className="h-3.5 w-3.5" aria-hidden />
        ) : (
          checkpoint.step
        )}
      </span>
      <span className="min-w-0 flex-1 font-medium">{label}</span>
      <StatusChip state={checkpoint.state} locale={locale} />
      <span className="tabular-nums text-muted-foreground">
        {checkpoint.percent}%
      </span>
      <span className="text-xs text-muted-foreground">{metric}</span>
    </Link>
  );
}

function StatusChip({
  state,
  locale,
}: {
  state: JourneyCheckpointState;
  locale: Locale;
}): ReactNode {
  const styles = STATE_STYLES[state];
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[0.65rem] font-medium",
        styles.node,
      )}
    >
      {stateAriaLabel(state, locale)}
    </span>
  );
}

function FinishNodeVisual({
  percent,
  label,
}: {
  percent: number;
  label: string;
}): ReactNode {
  return (
    <div className="flex max-w-[5.5rem] flex-col items-center gap-1.5 text-center">
      <span
        className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-brand-gold/50 bg-brand-gold/15 ring-2 ring-brand-gold/30"
      >
        <Flag className="h-4 w-4 text-brand-gold" aria-hidden />
      </span>
      <span className="line-clamp-2 text-[0.65rem] font-semibold leading-tight">
        {label}
      </span>
      <span className="text-[0.6rem] font-bold tabular-nums text-brand-gold">
        {percent}%
      </span>
    </div>
  );
}
