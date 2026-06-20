import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertBannerVariant = "partial" | "gap";

const VARIANT_STYLES: Record<
  AlertBannerVariant,
  { border: string; bg: string; icon: string; title: string; body: string }
> = {
  partial: {
    border: "border-readiness-partial/40",
    bg: "bg-readiness-partial-bg",
    icon: "text-readiness-partial",
    title: "text-readiness-partial",
    body: "text-foreground",
  },
  gap: {
    border: "border-readiness-gap/40",
    bg: "bg-readiness-gap-bg",
    icon: "text-readiness-gap",
    title: "text-readiness-gap",
    body: "text-foreground",
  },
};

interface AlertBannerProps {
  variant: AlertBannerVariant;
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  className?: string;
  role?: "alert" | "note";
  testId?: string;
}

export function AlertBanner({
  variant,
  icon: Icon,
  title,
  children,
  className,
  role = "alert",
  testId,
}: AlertBannerProps): React.ReactNode {
  const styles = VARIANT_STYLES[variant];

  return (
    <div
      role={role}
      data-testid={testId}
      className={cn(
        "rounded-lg border-2 px-4 py-4 shadow-sm",
        styles.border,
        styles.bg,
        className,
      )}
    >
      <div className="flex gap-3">
        <Icon className={cn("mt-0.5 h-6 w-6 shrink-0", styles.icon)} aria-hidden />
        <div className="space-y-2">
          <p
            className={cn(
              "text-base font-bold uppercase tracking-wide",
              styles.title,
            )}
          >
            {title}
          </p>
          <div className={cn("text-sm font-medium leading-relaxed", styles.body)}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
