import * as React from "react";
import { Button } from "@web/src/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@web/src/components/ui/tooltip";
import { Plus, Upload } from "lucide-react";
import { IMAGE_UPLOAD_LIMIT } from "@shared/utils/mediaUpload";
import { type ListingImageItem } from "@web/src/components/listings/categorize/shared";
import { CategorizeCategoryAccordion } from "@web/src/components/listings/categorize/components/CategorizeCategoryAccordion";

type CategorizeImageWorkspaceProps = {
  images: ListingImageItem[];
  categoryOrder: string[];
  categorizedImages: Record<string, ListingImageItem[]>;
  baseCategoryCounts: Record<string, number>;
  openCategories: string[];
  dragOverCategory: string | null;
  openImageMenuId: string | null;
  onOpenUpload: () => void;
  onOpenCreateCategory: () => void;
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

export function CategorizeImageWorkspace({
  images,
  categoryOrder,
  categorizedImages,
  baseCategoryCounts,
  openCategories,
  dragOverCategory,
  openImageMenuId,
  onOpenUpload,
  onOpenCreateCategory,
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
}: CategorizeImageWorkspaceProps) {
  return (
    <section className="flex-1">
      <div className="flex w-full gap-8">
        <div className="flex flex- w-full items-center gap-3">
          <h2 className="text-xl font-header text-foreground">
            Categorize Listing photos
          </h2>
          <div className="ml-auto flex items-center gap-2 flex-nowrap">
            <span className="text-xs text-muted-foreground mr-[9px] font-medium">
              {images.length}/{IMAGE_UPLOAD_LIMIT} photos
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={onOpenUpload}
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent sideOffset={6}>
                Upload more listing photos
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={onOpenCreateCategory}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent sideOffset={6}>Add a room category</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
      {images.length === 0 ? (
        <div className="mt-6 rounded-lg border border-border bg-secondary p-6 text-sm text-muted-foreground">
          No images uploaded yet.
        </div>
      ) : (
        <CategorizeCategoryAccordion
          categoryOrder={categoryOrder}
          categorizedImages={categorizedImages}
          baseCategoryCounts={baseCategoryCounts}
          openCategories={openCategories}
          dragOverCategory={dragOverCategory}
          openImageMenuId={openImageMenuId}
          onOpenCategoriesChange={onOpenCategoriesChange}
          onCategoryDragOver={onCategoryDragOver}
          onCategoryDragLeave={onCategoryDragLeave}
          onOpenImageMenuChange={onOpenImageMenuChange}
          onEditCategory={onEditCategory}
          onDeleteCategory={onDeleteCategory}
          onRequestMoveImage={onRequestMoveImage}
          onRequestDeleteImage={onRequestDeleteImage}
          handleSetPrimaryImage={handleSetPrimaryImage}
          handleDragStart={handleDragStart}
          handleDragEnd={handleDragEnd}
          handleDrop={handleDrop}
        />
      )}
    </section>
  );
}
