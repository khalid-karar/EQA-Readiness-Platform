import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const statusPillVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors",
  {
    variants: {
      variant: {
        conformant:
          "border-readiness-conformant/25 bg-readiness-conformant-bg text-readiness-conformant",
        partial:
          "border-readiness-partial/25 bg-readiness-partial-bg text-readiness-partial",
        gap: "border-readiness-gap/25 bg-readiness-gap-bg text-readiness-gap",
        unreviewed:
          "border-readiness-unreviewed/25 bg-readiness-unreviewed-bg text-readiness-unreviewed",
        neutral: "border-border bg-muted text-muted-foreground",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-[0.6875rem]",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "default",
    },
  },
);

export interface StatusPillProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusPillVariants> {}

export function StatusPill({
  className,
  variant,
  size,
  children,
  ...props
}: StatusPillProps): React.ReactNode {
  return (
    <span
      className={cn(statusPillVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </span>
  );
}

/** Maps legacy green/amber/red bands to semantic readiness variants. */
export function readinessVariantFromLevel(
  level: "green" | "amber" | "red",
): "conformant" | "partial" | "gap" {
  if (level === "green") return "conformant";
  if (level === "amber") return "partial";
  return "gap";
}

export { statusPillVariants };
