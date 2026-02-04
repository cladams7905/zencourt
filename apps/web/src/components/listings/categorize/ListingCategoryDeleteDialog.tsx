"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../../ui/dialog";
import { Button } from "../../ui/button";

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
          <DialogTitle>Delete category</DialogTitle>
          <DialogDescription>
            Delete &quot;{categoryLabel}&quot;? Photos in this category will
            move to Uncategorized.
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
