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
import { Input } from "@web/src/components/ui/input";
import { Button } from "@web/src/components/ui/button";
import {
  ROOM_CATEGORIES,
  type RoomCategory
} from "@web/src/lib/domain/listings/image/roomCategories";

const MAX_CUSTOM_CATEGORY_LENGTH = 20;
const CATEGORY_OPTIONS = Object.values(ROOM_CATEGORIES)
  .filter((category) => category.id !== "other")
  .sort((a, b) => a.order - b.order);

type ListingCategoryDialogProps = {
  open: boolean;
  mode: "add" | "edit";
  initialCategory?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: string) => void;
};

const getCategoryBase = (value: string) => value.replace(/-\d+$/, "");

export function ListingCategoryDialog({
  open,
  mode,
  initialCategory,
  onOpenChange,
  onSubmit
}: ListingCategoryDialogProps) {
  const [selectedCategory, setSelectedCategory] = React.useState("");
  const [customCategory, setCustomCategory] = React.useState("");

  React.useEffect(() => {
    if (!open) {
      return;
    }
    if (!initialCategory) {
      setSelectedCategory("");
      setCustomCategory("");
      return;
    }
    const base = getCategoryBase(initialCategory);
    const isKnown = Boolean(ROOM_CATEGORIES[base as RoomCategory]);
    setSelectedCategory(isKnown ? base : "custom");
    setCustomCategory(isKnown ? "" : initialCategory);
  }, [initialCategory, open]);

  const resolvedCategory =
    selectedCategory === "custom" ? customCategory.trim() : selectedCategory;

  const title = mode === "edit" ? "Rename space" : "Add a space";
  const description =
    mode === "edit"
      ? "Edit the space name."
      : "Add a new property space to your video plan.";
  const primaryActionLabel = mode === "edit" ? "Save changes" : "Add";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Space{" "}
            </label>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a space" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom…</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {selectedCategory === "custom" && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Custom space
              </label>
              <Input
                placeholder="e.g., Sunroom"
                value={customCategory}
                maxLength={MAX_CUSTOM_CATEGORY_LENGTH}
                onChange={(event) =>
                  setCustomCategory(
                    event.target.value.slice(0, MAX_CUSTOM_CATEGORY_LENGTH)
                  )
                }
              />
              <p className="text-[11px] text-muted-foreground">
                {customCategory.length}/{MAX_CUSTOM_CATEGORY_LENGTH} characters
              </p>
            </div>
          )}
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
            onClick={() => onSubmit(resolvedCategory)}
            disabled={!resolvedCategory}
          >
            {primaryActionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
