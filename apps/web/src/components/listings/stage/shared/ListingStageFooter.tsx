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
  backLabel?: string;
};

export function ListingStageFooter({
  onContinue,
  onBack,
  canContinue = true,
  canBack = true,
  isSubmitting = false,
  continueLabel = "Continue",
  backLabel = "Back"
}: ListingStageFooterProps) {
  const hasBack = Boolean(onBack);
  const hasContinue = Boolean(onContinue);
  const bothActions = hasBack && hasContinue;

  return (
    <div
      className={cn(
        "flex w-full flex-row items-center gap-3 bg-background/90 pointer-events-none backdrop-blur-md supports-backdrop-filter:bg-background/90",
        bothActions ? "justify-between lg:justify-end" : "justify-end"
      )}
    >
      {onBack ? (
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="min-w-0 w-full flex-1 lg:w-auto lg:flex-none lg:shrink"
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
          className="w-full flex-1 lg:w-auto lg:flex-none lg:shrink-0"
          onClick={onContinue}
          disabled={!canContinue || isSubmitting}
        >
          {continueLabel}
        </Button>
      ) : null}
    </div>
  );
}
