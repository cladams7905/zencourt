import * as React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@web/src/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@web/src/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { MAX_IMAGES_PER_ROOM } from "@shared/utils/mediaUpload";
import { formatCategoryLabel } from "@web/src/components/listings/stage/categorize/domain/categoryRules";
import { type ListingImageItem } from "@web/src/components/listings/stage/categorize/shared";
import { CategorizeImageCard } from "./CategorizeImageCard";

type CategorizeCategoryAccordionProps = {
  categoryOrder: string[];
  usedImagesByCategory: Record<string, ListingImageItem[]>;
  categoryUsageCounts: Record<string, number>;
  baseCategoryCounts: Record<string, number>;
  openCategories: string[];
  dragOverCategory: string | null;
  openImageMenuId: string | null;
  onOpenCategoriesChange: (categories: string[]) => void;
  onCategoryDragOver: (category: string) => void;
  onCategoryDragLeave: () => void;
  onOpenImageMenuChange: (imageId: string | null) => void;
  onEditCategory: (category: string) => void;
  onDeleteCategory: (category: string) => void;
  onRequestMoveImage: (imageId: string) => void;
  onRequestDeleteImage: (imageId: string) => void;
  handleDragStart: (
    imageId: string
  ) => (event: React.DragEvent<HTMLDivElement>) => void;
  handleDragEnd: () => void;
  handleDrop: (
    category: string
  ) => (event: React.DragEvent<HTMLDivElement>) => void | Promise<void>;
};

export function CategorizeCategoryAccordion({
  categoryOrder,
  usedImagesByCategory,
  categoryUsageCounts,
  baseCategoryCounts,
  openCategories,
  dragOverCategory,
  openImageMenuId,
  onOpenCategoriesChange,
  onCategoryDragOver,
  onCategoryDragLeave,
  onOpenImageMenuChange,
  onEditCategory,
  onDeleteCategory,
  onRequestMoveImage,
  onRequestDeleteImage,
  handleDragStart,
  handleDragEnd,
  handleDrop
}: CategorizeCategoryAccordionProps) {
  return (
    <Accordion
      type="multiple"
      value={openCategories}
      onValueChange={onOpenCategoriesChange}
      className="mt-6 space-y-4"
    >
      {categoryOrder.map((category) => (
        <AccordionItem
          key={category}
          value={category}
          className="border border-border bg-card px-4"
        >
          <AccordionTrigger
            className="py-4"
            onDragOver={(event) => {
              event.preventDefault();
              onCategoryDragOver(category);
            }}
          >
            <div className="flex w-full items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-foreground">
                {formatCategoryLabel(category, baseCategoryCounts)}
              </div>
              <div className="flex items-center gap-4">
                <span
                  className={`text-xs ${
                    (categoryUsageCounts[category] ?? 0) > MAX_IMAGES_PER_ROOM
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {(categoryUsageCounts[category] ?? 0)}/{MAX_IMAGES_PER_ROOM} used
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div
                      role="button"
                      tabIndex={0}
                      className="flex items-center justify-center rounded-full p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                      aria-label="Category settings"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                        }
                        event.stopPropagation();
                      }}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={8}>
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault();
                        onEditCategory(category);
                      }}
                    >
                      <Pencil size={12} />
                      Rename category
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-1.5 bg-border/50" />
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={(event) => {
                        event.preventDefault();
                        onDeleteCategory(category);
                      }}
                    >
                      <Trash2 size={12} />
                      Delete category
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div
              className={`rounded-lg border border-dashed px-3 py-3 transition-colors ${
                dragOverCategory === category
                  ? "border-foreground/40 bg-secondary"
                  : "border-border"
              }`}
              onDragOver={(event) => {
                event.preventDefault();
                if (dragOverCategory !== category) {
                  onCategoryDragOver(category);
                }
              }}
              onDragLeave={(event) => {
                if (
                  !event.currentTarget.contains(
                    event.relatedTarget as Node | null
                  )
                ) {
                  onCategoryDragLeave();
                }
              }}
              onDrop={handleDrop(category)}
            >
              {usedImagesByCategory[category]?.length ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {usedImagesByCategory[category].map((image) => (
                    <CategorizeImageCard
                      key={image.id}
                      image={image}
                      context="used"
                      openImageMenuId={openImageMenuId}
                      onOpenImageMenuChange={onOpenImageMenuChange}
                      onRequestMoveImage={onRequestMoveImage}
                      onRequestDeleteImage={onRequestDeleteImage}
                      handleDragStart={handleDragStart}
                      handleDragEnd={handleDragEnd}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                  Drag unused photos here to add them to the used set for this category.
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
