import * as React from "react";
import { Button } from "@web/src/components/ui/button";
import { cn } from "@web/src/components/ui/utils";

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
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
      {onBack ? (
        <Button
          type="button"
          size="lg"
          variant="outline"
          className={cn("w-full lg:w-auto")}
          onClick={onBack}
          disabled={!canBack}
        >
          {backLabel}
        </Button>
      ) : null}
      {onContinue ? (
        <Button
          type="button"
          size="lg"
          className={cn("w-full lg:w-auto")}
          onClick={onContinue}
          disabled={!canContinue || isSubmitting}
        >
          {isSubmitting ? continueLoadingLabel : continueLabel}
        </Button>
      ) : null}
    </div>
  );
}
