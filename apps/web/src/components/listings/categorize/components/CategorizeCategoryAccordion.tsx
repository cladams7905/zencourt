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
import { formatCategoryLabel } from "@web/src/components/listings/categorize/domain";
import {
  UNCATEGORIZED_CATEGORY_ID,
  type ListingImageItem
} from "@web/src/components/listings/categorize/shared";
import { CategorizeImageCard } from "@web/src/components/listings/categorize/components/CategorizeImageCard";

type CategorizeCategoryAccordionProps = {
  categoryOrder: string[];
  categorizedImages: Record<string, ListingImageItem[]>;
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
  handleSetPrimaryImage: (imageId: string) => void | Promise<void>;
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
  categorizedImages,
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
  handleSetPrimaryImage,
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
          className={`border px-4 ${
            category === UNCATEGORIZED_CATEGORY_ID
              ? "border-destructive/20 bg-destructive/10 text-destructive"
              : "border-border bg-card"
          }`}
        >
          <AccordionTrigger
            className={`py-4 ${
              category === UNCATEGORIZED_CATEGORY_ID ? "text-destructive" : ""
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              onCategoryDragOver(category);
            }}
          >
            <div className="flex w-full items-center justify-between gap-4">
              <div
                className={`flex items-center gap-2 text-sm ${
                  category === UNCATEGORIZED_CATEGORY_ID
                    ? "text-destructive"
                    : "text-foreground"
                }`}
              >
                {formatCategoryLabel(category, baseCategoryCounts)}
              </div>
              <div className="flex items-center gap-4">
                {(() => {
                  const count = categorizedImages[category]?.length ?? 0;
                  return (
                    <span
                      className={`text-xs ${
                        category === UNCATEGORIZED_CATEGORY_ID
                          ? "text-destructive/80"
                          : "text-muted-foreground"
                      }`}
                    >
                      {category === UNCATEGORIZED_CATEGORY_ID
                        ? `${count} photo${count === 1 ? "" : "s"}`
                        : `${count}/${MAX_IMAGES_PER_ROOM} photos`}
                    </span>
                  );
                })()}
                {category !== UNCATEGORIZED_CATEGORY_ID ? (
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
                ) : (
                  <div className="h-6 w-6" />
                )}
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div
              className={`rounded-lg border border-dashed px-3 py-3 transition-colors ${
                category === UNCATEGORIZED_CATEGORY_ID
                  ? dragOverCategory === category
                    ? "border-destructive/60 bg-destructive/10"
                    : "border-destructive/30"
                  : dragOverCategory === category
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
                  !event.currentTarget.contains(event.relatedTarget as Node | null)
                ) {
                  onCategoryDragLeave();
                }
              }}
              onDrop={handleDrop(category)}
            >
              {categorizedImages[category]?.length ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {[...categorizedImages[category]]
                    .sort((a, b) => {
                      const primaryA = a.isPrimary ? 1 : 0;
                      const primaryB = b.isPrimary ? 1 : 0;
                      return primaryB - primaryA;
                    })
                    .map((image) => (
                      <CategorizeImageCard
                        key={image.id}
                        image={image}
                        openImageMenuId={openImageMenuId}
                        onOpenImageMenuChange={onOpenImageMenuChange}
                        onRequestMoveImage={onRequestMoveImage}
                        onRequestDeleteImage={onRequestDeleteImage}
                        handleSetPrimaryImage={handleSetPrimaryImage}
                        handleDragStart={handleDragStart}
                        handleDragEnd={handleDragEnd}
                      />
                    ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                  Drag photos here to add to this category.
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
