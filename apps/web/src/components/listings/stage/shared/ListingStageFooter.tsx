import * as React from "react";
import { TriangleAlert } from "lucide-react";
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
  validationMessages?: string[];
};

export function ListingStageFooter({
  onContinue,
  onBack,
  canContinue = true,
  canBack = true,
  isSubmitting = false,
  continueLabel = "Continue",
  backLabel = "Back",
  validationMessages = []
}: ListingStageFooterProps) {
  const hasBack = Boolean(onBack);
  const hasContinue = Boolean(onContinue);
  const bothActions = hasBack && hasContinue;

  return (
    <div className="flex w-full flex-col gap-3">
      {validationMessages.length > 0 ? (
        <div className="flex flex-col gap-1 rounded-lg px-3 py-2 text-sm text-muted-foreground">
          <div className="flex flex-col gap-1">
            {validationMessages.map((message) => (
              <div key={message} className="flex items-start gap-2">
                <TriangleAlert
                  data-testid="footer-validation-icon"
                  className="mt-0.5 size-4 shrink-0 text-warning"
                />
                <span>{message}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div
        className={cn(
          "flex w-full flex-row items-center gap-3",
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
    </div>
  );
}
