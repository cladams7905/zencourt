"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@web/src/components/ui/dialog";
import { Button } from "@web/src/components/ui/button";

type ListingCategoryDeleteDialogProps = {
  open: boolean;
  categoryLabel: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function ListingCategoryDeleteDialog({
  open,
  categoryLabel,
  onOpenChange,
  onConfirm
}: ListingCategoryDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Delete room</DialogTitle>
          <DialogDescription>
            Delete &quot;{categoryLabel}&quot;? All images in this room will be
            moved to &quot;Unused photos&quot;.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            Delete category
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
