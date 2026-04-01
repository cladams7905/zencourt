import * as React from "react";
import { Button } from "@web/src/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@web/src/components/ui/tooltip";
import { Plus, Upload } from "lucide-react";
import { IMAGE_UPLOAD_LIMIT } from "@shared/utils/mediaUpload";
import { type ListingImageItem } from "@web/src/components/listings/stage/categorize/shared";
import { CategorizeCategoryAccordion } from "./CategorizeCategoryAccordion";
import { CategorizeUnusedDock } from "./CategorizeUnusedDock";

type CategorizeImageWorkspaceProps = {
  images: ListingImageItem[];
  categoryOrder: string[];
  usedImagesByCategory: Record<string, ListingImageItem[]>;
  dockedImages: ListingImageItem[];
  categoryUsageCounts: Record<string, number>;
  baseCategoryCounts: Record<string, number>;
  usedImageCount: number;
  maxUsedImagesTotal: number;
  uncategorizedDockCount: number;
  hasOverUsedLimit: boolean;
  categoriesOverUsedLimit: string[];
  openCategories: string[];
  dragOverCategory: string | null;
  openImageMenuId: string | null;
  onOpenUpload: () => void;
  onOpenCreateCategory: () => void;
  onOpenCategoriesChange: (categories: string[]) => void;
  onCategoryDragOver: (category: string) => void;
  onCategoryDragLeave: () => void;
  onDockDragOver: () => void;
  onDockDragLeave: () => void;
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
  handleDockDrop: (
    event: React.DragEvent<HTMLDivElement>
  ) => void | Promise<void>;
};

export function CategorizeImageWorkspace({
  images,
  categoryOrder,
  usedImagesByCategory,
  dockedImages,
  categoryUsageCounts,
  baseCategoryCounts,
  usedImageCount,
  maxUsedImagesTotal,
  uncategorizedDockCount,
  hasOverUsedLimit,
  categoriesOverUsedLimit,
  openCategories,
  dragOverCategory,
  openImageMenuId,
  onOpenUpload,
  onOpenCreateCategory,
  onOpenCategoriesChange,
  onCategoryDragOver,
  onCategoryDragLeave,
  onDockDragOver,
  onDockDragLeave,
  onOpenImageMenuChange,
  onEditCategory,
  onDeleteCategory,
  onRequestMoveImage,
  onRequestDeleteImage,
  handleDragStart,
  handleDragEnd,
  handleDrop,
  handleDockDrop
}: CategorizeImageWorkspaceProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
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
              <TooltipContent sideOffset={6}>
                Add a room category
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            hasOverUsedLimit
              ? "bg-destructive/10 text-destructive"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          {usedImageCount}/{maxUsedImagesTotal} used photos
        </div>
        {categoriesOverUsedLimit.length > 0 ? (
          <div className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
            {categoriesOverUsedLimit.length} room
            {categoriesOverUsedLimit.length === 1 ? "" : "s"} over the used-photo
            limit
          </div>
        ) : null}
      </div>
      {images.length === 0 ? (
        <div className="mt-6 rounded-lg border border-border bg-secondary p-6 text-sm text-muted-foreground">
          No images uploaded yet.
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-6">
          <CategorizeCategoryAccordion
            categoryOrder={categoryOrder}
            usedImagesByCategory={usedImagesByCategory}
            categoryUsageCounts={categoryUsageCounts}
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
            handleDragStart={handleDragStart}
            handleDragEnd={handleDragEnd}
            handleDrop={handleDrop}
          />
          <CategorizeUnusedDock
            dockedImages={dockedImages}
            dragOverCategory={dragOverCategory}
            openImageMenuId={openImageMenuId}
            usedImageCount={usedImageCount}
            maxUsedImagesTotal={maxUsedImagesTotal}
            uncategorizedDockCount={uncategorizedDockCount}
            hasOverUsedLimit={hasOverUsedLimit}
            onOpenImageMenuChange={onOpenImageMenuChange}
            onRequestMoveImage={onRequestMoveImage}
            onRequestDeleteImage={onRequestDeleteImage}
            onDockDragOver={onDockDragOver}
            onDockDragLeave={onDockDragLeave}
            handleDragStart={handleDragStart}
            handleDragEnd={handleDragEnd}
            handleDockDrop={handleDockDrop}
          />
        </div>
      )}
    </section>
  );
}
