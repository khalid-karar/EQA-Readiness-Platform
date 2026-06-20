"use client";

import { AlertTriangle } from "lucide-react";
import { AlertBanner } from "@/components/ui/alert-banner";
import type { MockEqaPresentation } from "@/lib/present-mock-eqa";
import { uiLabel } from "@/lib/ui-labels";

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
    <AlertBanner
      variant="partial"
      icon={AlertTriangle}
      title={disclaimerShort}
      testId="mock-eqa-disclaimer"
    >
      <p>{disclaimerText}</p>
      {view.isSummaryView ? (
        <p className="text-xs opacity-90">
          {uiLabel("mockEqaBoardReadOnly", view.locale)}
        </p>
      ) : null}
    </AlertBanner>
  );
}
