import * as React from "react";
import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactNode {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted motion-safe",
        className,
      )}
      aria-hidden
      {...props}
    />
  );
}

export { Skeleton };
