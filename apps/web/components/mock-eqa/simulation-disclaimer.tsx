"use client";

import type { MockEqaPresentation } from "@/lib/present-mock-eqa";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface SimulationDisclaimerBannerProps {
  presentation: MockEqaPresentation;
}

/**
 * Unavoidable, prominent disclaimer — readiness simulation only, never a formal
 * external-assessor conclusion.
 */
export function SimulationDisclaimerBanner({
  presentation,
}: SimulationDisclaimerBannerProps): React.ReactNode {
  const { disclaimerText, disclaimerShort, view } = presentation;

  return (
    <div
      role="alert"
      aria-live="polite"
      data-testid="mock-eqa-disclaimer"
      className={cn(
        "rounded-lg border-2 border-amber-500 bg-amber-50 px-4 py-4 shadow-sm",
        "dark:border-amber-600 dark:bg-amber-950/50",
      )}
    >
      <div className="flex gap-3">
        <AlertTriangle
          className="mt-0.5 h-6 w-6 shrink-0 text-amber-600 dark:text-amber-400"
          aria-hidden
        />
        <div className="space-y-2">
          <p className="text-base font-bold uppercase tracking-wide text-amber-900 dark:text-amber-100">
            {disclaimerShort}
          </p>
          <p className="text-sm font-medium leading-relaxed text-amber-950 dark:text-amber-50">
            {disclaimerText}
          </p>
          {view.isSummaryView ? (
            <p className="text-xs text-amber-800 dark:text-amber-200">
              {view.locale === "ar"
                ? "عرض إشرافي للقراءة فقط — لا يمكن للمجلس تشغيل المحاكاة."
                : "Read-only oversight view — Board cannot run the simulation."}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
