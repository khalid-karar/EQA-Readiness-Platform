import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ScreenAlertVariant = "brand" | "partial" | "unreviewed" | "gap";

const VARIANT_CLASSES: Record<ScreenAlertVariant, string> = {
  brand: "border-brand-gold/30 bg-brand-gold/5",
  partial: "border-readiness-partial/30 bg-readiness-partial-bg/30",
  unreviewed: "border-readiness-unreviewed/30 bg-readiness-unreviewed-bg/40",
  gap: "border-readiness-gap/30 bg-readiness-gap-bg/40",
};

const TITLE_CLASSES: Record<ScreenAlertVariant, string | undefined> = {
  brand: undefined,
  partial: undefined,
  unreviewed: "text-readiness-unreviewed",
  gap: "text-readiness-gap",
};

interface ScreenAlertBannerProps {
  variant: ScreenAlertVariant;
  title: string;
  children: ReactNode;
  className?: string;
}

export function ScreenAlertBanner({
  variant,
  title,
  children,
  className,
}: ScreenAlertBannerProps): ReactNode {
  return (
    <Card className={cn(VARIANT_CLASSES[variant], className)}>
      <CardHeader className="pb-2">
        <CardTitle className={cn("text-base", TITLE_CLASSES[variant])}>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{children}</CardContent>
    </Card>
  );
}
