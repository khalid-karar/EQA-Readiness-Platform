import type { Locale } from "@eqa/content";
import { uiLabel } from "./ui-labels";

/** Oversight-friendly schedule label — no owner names or exact dates. */
export function remediationTrackLabel(
  locale: Locale,
  isOverdue: boolean,
  isClosed: boolean,
): string {
  if (isClosed) return uiLabel("closed", locale);
  if (isOverdue) return uiLabel("overdue", locale);
  return uiLabel("onTrack", locale);
}
