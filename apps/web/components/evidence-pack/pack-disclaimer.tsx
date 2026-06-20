"use client";

import { FileWarning, AlertTriangle } from "lucide-react";
import { AlertBanner } from "@/components/ui/alert-banner";
import type { EvidencePackPresentation } from "@/lib/present-evidence-pack";
import { uiLabel } from "@/lib/ui-labels";

interface PackDisclaimerBannerProps {
  presentation: EvidencePackPresentation;
}

/** Prominent disclaimer + confidentiality notice — unavoidable on the screen. */
export function PackDisclaimerBanner({
  presentation,
}: PackDisclaimerBannerProps): React.ReactNode {
  return (
    <div className="space-y-3">
      <AlertBanner
        variant="partial"
        icon={AlertTriangle}
        title={presentation.disclaimerShort}
        testId="evidence-pack-disclaimer"
      >
        <p>{presentation.disclaimerText}</p>
      </AlertBanner>

      <AlertBanner
        variant="gap"
        icon={FileWarning}
        title={uiLabel("packConfidentialityHeading", presentation.locale)}
        role="note"
        testId="evidence-pack-confidentiality"
      >
        <p className="font-semibold">{presentation.confidentialityText}</p>
      </AlertBanner>
    </div>
  );
}
