"use client";

import type { EvidencePackPresentation } from "@/lib/present-evidence-pack";
import { cn } from "@/lib/utils";
import { AlertTriangle, FileWarning } from "lucide-react";

interface PackDisclaimerBannerProps {
  presentation: EvidencePackPresentation;
}

/** Prominent disclaimer + confidentiality notice — unavoidable on the screen. */
export function PackDisclaimerBanner({
  presentation,
}: PackDisclaimerBannerProps): React.ReactNode {
  return (
    <div className="space-y-3">
      <div
        role="alert"
        data-testid="evidence-pack-disclaimer"
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
              {presentation.disclaimerShort}
            </p>
            <p className="text-sm font-medium leading-relaxed text-amber-950 dark:text-amber-50">
              {presentation.disclaimerText}
            </p>
          </div>
        </div>
      </div>

      <div
        role="note"
        data-testid="evidence-pack-confidentiality"
        className={cn(
          "rounded-lg border-2 border-red-700/60 bg-red-50 px-4 py-3",
          "dark:border-red-800 dark:bg-red-950/40",
        )}
      >
        <div className="flex gap-3">
          <FileWarning
            className="mt-0.5 h-5 w-5 shrink-0 text-red-700 dark:text-red-400"
            aria-hidden
          />
          <p className="text-sm font-semibold text-red-900 dark:text-red-100">
            {presentation.confidentialityText}
          </p>
        </div>
      </div>
    </div>
  );
}
