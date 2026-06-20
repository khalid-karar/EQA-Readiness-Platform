import type { Locale } from "@eqa/content";
import { uiLabel } from "./ui-labels";

/** Days-past-due label for schedule badges and alerts (single phrase, no duplication). */
export function overdueDaysLabel(locale: Locale, days: number): string {
  if (locale === "ar") {
    if (days === 0) return uiLabel("overdue", locale);
    if (days === 1) return "يوم واحد متأخر";
    return `${days} يوم متأخر`;
  }
  if (days === 0) return uiLabel("overdue", locale);
  return days === 1 ? "1 day overdue" : `${days} days overdue`;
}

/** Oversight-friendly schedule label — includes day count when overdue. */
export function remediationScheduleLabel(
  locale: Locale,
  isOverdue: boolean,
  isClosed: boolean,
  daysOverdue: number,
): string {
  if (isClosed) return uiLabel("closed", locale);
  if (isOverdue) return overdueDaysLabel(locale, daysOverdue);
  return uiLabel("onTrack", locale);
}

/** @deprecated Use {@link remediationScheduleLabel} with days for overdue rows. */
export function remediationTrackLabel(
  locale: Locale,
  isOverdue: boolean,
  isClosed: boolean,
): string {
  return remediationScheduleLabel(locale, isOverdue, isClosed, 0);
}
