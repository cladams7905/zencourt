import * as React from "react";
import { Button } from "@web/src/components/ui/button";

type ListingStageFooterProps = {
  onContinue?: () => void;
  onBack?: () => void;
  canContinue?: boolean;
  canBack?: boolean;
  isSubmitting?: boolean;
  continueLabel?: string;
  continueLoadingLabel?: string;
  backLabel?: string;
};

export function ListingStageFooter({
  onContinue,
  onBack,
  canContinue = true,
  canBack = true,
  isSubmitting = false,
  continueLabel = "Continue",
  continueLoadingLabel = "Submitting...",
  backLabel = "Back"
}: ListingStageFooterProps) {
  return (
    <div className="flex items-center justify-end gap-3">
      {onBack ? (
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={!canBack}
        >
          {backLabel}
        </Button>
      ) : null}
      {onContinue ? (
        <Button type="button" onClick={onContinue} disabled={!canContinue || isSubmitting}>
          {isSubmitting ? continueLoadingLabel : continueLabel}
        </Button>
      ) : null}
    </div>
  );
}
