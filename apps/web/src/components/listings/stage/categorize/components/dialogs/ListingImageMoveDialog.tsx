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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@web/src/components/ui/select";
import { Button } from "@web/src/components/ui/button";

type MoveOption = {
  value: string;
  label: string;
};

type ListingImageMoveDialogProps = {
  open: boolean;
  imageName?: string | null;
  options: MoveOption[];
  currentValue?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: string) => void;
};

export function ListingImageMoveDialog({
  open,
  imageName,
  options,
  currentValue,
  onOpenChange,
  onSubmit
}: ListingImageMoveDialogProps) {
  const [selected, setSelected] = React.useState(currentValue ?? "");

  React.useEffect(() => {
    if (open) {
      setSelected(currentValue ?? "");
    }
  }, [currentValue, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Move photo</DialogTitle>
          <DialogDescription>
            {imageName
              ? `Move "${imageName}" to a different category.`
              : "Move this photo to a different category."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Destination
          </label>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onSubmit(selected)}
            disabled={!selected}
          >
            Move photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
