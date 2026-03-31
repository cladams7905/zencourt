"use client";

import * as React from "react";
import { Button } from "@web/src/components/ui/button";
import { Checkbox } from "@web/src/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@web/src/components/ui/dialog";
import { Label } from "@web/src/components/ui/label";

type ReviewConfirmContinueDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  canConfirm: boolean;
};

export function ReviewConfirmContinueDialog({
  open,
  onOpenChange,
  onConfirm,
  canConfirm
}: ReviewConfirmContinueDialogProps) {
  const [isProceedConfirmed, setIsProceedConfirmed] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setIsProceedConfirmed(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Confirm details before we proceed</DialogTitle>
          <DialogDescription>
            We’ll generate video content from your categorized listing photos and
            the property details you’ve reviewed. After this step, changes won’t
            be available.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-8 text-sm text-muted-foreground">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Next steps</p>
            <ul className="space-y-1">
              <li>
                • We’ll turn your categorized photos into short-form video
                content.
              </li>
              <li>
                • Property details will be used to generate captions, hooks, and
                overlays.
              </li>
              <li>
                • You’ll review and publish content once generation completes.
              </li>
            </ul>
          </div>
          <div className="my-2 rounded-lg border border-border bg-secondary px-3 py-3 text-sm text-foreground">
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
                className="cursor-pointer text-sm font-normal leading-relaxed"
              >
                I confirm that my listing photos and property details are
                accurate.
              </Label>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Review again
          </Button>
          <Button
            disabled={!isProceedConfirmed || !canConfirm}
            onClick={() => {
              onOpenChange(false);
              void onConfirm();
            }}
          >
            Confirm &amp; Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
