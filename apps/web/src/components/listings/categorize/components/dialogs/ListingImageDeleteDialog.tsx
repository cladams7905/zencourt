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

type ListingImageDeleteDialogProps = {
  open: boolean;
  imageName?: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function ListingImageDeleteDialog({
  open,
  imageName,
  onOpenChange,
  onConfirm
}: ListingImageDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Delete photo</DialogTitle>
          <DialogDescription>
            {imageName
              ? `Delete "${imageName}"? This action cannot be undone.`
              : "Delete this photo? This action cannot be undone."}
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
            Delete photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
