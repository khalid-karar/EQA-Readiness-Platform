import type { ItemStatus } from "@eqa/workflows";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Clock,
  Flag,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_ICONS: Record<ItemStatus, LucideIcon> = {
  not_assessed: CircleDashed,
  evidence_requested: Clock,
  evidence_submitted: Clock,
  ai_flagged: Flag,
  under_human_review: Clock,
  gap_confirmed: AlertTriangle,
  reviewed_no_gap: CheckCircle2,
  remediation_in_progress: AlertTriangle,
  ready_for_retest: Clock,
  closed_ready: CheckCircle2,
  not_applicable: CheckCircle2,
};

const LEVEL_VARIANT = {
  green: "green",
  amber: "amber",
  red: "red",
} as const;

interface StatusBadgeProps {
  status: ItemStatus;
  label: string;
  level: keyof typeof LEVEL_VARIANT;
  className?: string;
}

export function StatusBadge({
  status,
  label,
  level,
  className,
}: StatusBadgeProps): React.ReactNode {
  const Icon = STATUS_ICONS[status];

  return (
    <Badge
      variant={LEVEL_VARIANT[level]}
      className={cn("gap-1.5 font-normal", className)}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span>{label}</span>
    </Badge>
  );
}
