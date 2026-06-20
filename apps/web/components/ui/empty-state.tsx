import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps): React.ReactNode {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground"
        aria-hidden
      >
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {actionLabel && onAction ? (
        <Button type="button" size="sm" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
