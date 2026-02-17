import * as React from "react";
import { AlertTriangle, SearchCheck } from "lucide-react";
import { Button } from "@web/src/components/ui/button";
import { Checkbox } from "@web/src/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@web/src/components/ui/dialog";
import { Label } from "@web/src/components/ui/label";

type ReviewSidebarActionsProps = {
  requiredFixes: string[];
  canContinue: boolean;
  isSaving: boolean;
  isGoingBack: boolean;
  onConfirmContinue: () => void | Promise<void>;
  onGoBack: () => void | Promise<void>;
};

export const ReviewSidebarActions = ({
  requiredFixes,
  canContinue,
  isSaving,
  isGoingBack,
  onConfirmContinue,
  onGoBack
}: ReviewSidebarActionsProps) => {
  const [isContinueOpen, setIsContinueOpen] = React.useState(false);
  const [isProceedConfirmed, setIsProceedConfirmed] = React.useState(false);

  return (
    <div className="rounded-lg border border-border bg-secondary px-4 py-4 space-y-3">
      <div className="flex gap-3 items-center rounded-lg p-2">
        <SearchCheck className="h-8 w-8 text-foreground" />
        <p className="text-xs text-foreground">
          Please review all property details for accuracy before continuing.
        </p>
      </div>
      {requiredFixes.length > 0 ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-3 text-xs text-destructive">
          <p className="text-[11px] font-semibold uppercase tracking-wide">
            Required fixes
          </p>
          <ul className="mt-2 space-y-2 text-destructive">
            {requiredFixes.map((fix) => (
              <li key={fix} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
                <span>{fix}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="my-4 h-px w-full bg-border/60" />
      <Dialog
        open={isContinueOpen}
        onOpenChange={(open) => {
          setIsContinueOpen(open);
          if (!open) {
            setIsProceedConfirmed(false);
          }
        }}
      >
        <DialogTrigger asChild>
          <Button className="w-full" disabled={!canContinue || isSaving}>
            Continue
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Confirm details before we proceed</DialogTitle>
            <DialogDescription>
              We’ll generate video content from your categorized listing photos
              and the property details you’ve reviewed. After this step, changes
              won’t be available.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-8 text-sm text-muted-foreground">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Next steps</p>
              <ul className="space-y-1">
                <li>• We’ll turn your categorized photos into short-form video content.</li>
                <li>• Property details will be used to generate captions, hooks, and overlays.</li>
                <li>• You’ll review and publish content once generation completes.</li>
              </ul>
            </div>
            <div className="rounded-lg border border-border my-2 bg-secondary px-3 py-3 text-sm text-foreground">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="confirm-ready-to-proceed"
                  checked={isProceedConfirmed}
                  onCheckedChange={(checked) =>
                    setIsProceedConfirmed(Boolean(checked))
                  }
                />
                <Label
                  htmlFor="confirm-ready-to-proceed"
                  className="text-sm font-normal leading-relaxed cursor-pointer"
                >
                  I confirm that my listing photos and property details are
                  accurate.
                </Label>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setIsContinueOpen(false)}>
              Review again
            </Button>
            <Button
              disabled={!isProceedConfirmed}
              onClick={() => {
                setIsContinueOpen(false);
                void onConfirmContinue();
              }}
            >
              Confirm &amp; Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Button
        variant="ghost"
        className="w-full hover:bg-foreground/5"
        onClick={() => void onGoBack()}
        disabled={isGoingBack}
      >
        {isGoingBack ? "Going back..." : "Go back"}
      </Button>
    </div>
  );
};
