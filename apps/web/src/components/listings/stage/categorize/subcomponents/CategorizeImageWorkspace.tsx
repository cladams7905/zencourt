import * as React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@web/src/components/ui/accordion";
import { Button } from "@web/src/components/ui/button";
import { cn } from "@web/src/components/ui/utils";
import { formatCategoryLabel } from "@web/src/components/listings/stage/categorize/domain/categoryRules";
import {
  categoryDockDropZoneId,
  categoryUsedDropZoneId,
  UNCATEGORIZED_CATEGORY_ID,
  UNUSED_DOCK_DROP_ZONE_ID,
  type ListingImageItem
} from "@web/src/components/listings/stage/categorize/shared";
import { CategorizeImageCard } from "./CategorizeImageCard";

type CategorizeImageWorkspaceProps = {
  images: ListingImageItem[];
  workspaceCategoryOrder: string[];
  usedImagesByCategory: Record<string, ListingImageItem[]>;
  dockedImagesByCategory: Record<string, ListingImageItem[]>;
  dockedImagesCount: number;
  baseCategoryCounts: Record<string, number>;
  usedImageCount: number;
  maxUsedImagesTotal: number;
  hasOverUsedLimit: boolean;
  categoriesOverUsedLimit: string[];
  dragOverCategory: string | null;
  openImageMenuId: string | null;
  onOpenCreateCategory: () => void;
  onCategoryUsedDragOver: (category: string) => void;
  onCategoryUnusedDragOver: (category: string) => void;
  onCategoryRowDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
  onGlobalUnusedDockDragOver: () => void;
  onGlobalUnusedDockDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
  onOpenImageMenuChange: (imageId: string | null) => void;
  onRequestMoveImage: (imageId: string) => void;
  onRequestDeleteImage: (imageId: string) => void;
  handleDragStart: (
    imageId: string
  ) => (event: React.DragEvent<HTMLDivElement>) => void;
  handleDragEnd: () => void;
  handleDropOnCategoryUsed: (
    category: string
  ) => (event: React.DragEvent<HTMLDivElement>) => void | Promise<void>;
  handleDropOnCategoryUnusedStrip: (
    category: string
  ) => (event: React.DragEvent<HTMLDivElement>) => void | Promise<void>;
  handleGlobalUnusedDockDrop: (
    event: React.DragEvent<HTMLDivElement>
  ) => void | Promise<void>;
};

export function CategorizeImageWorkspace({
  images,
  workspaceCategoryOrder,
  usedImagesByCategory,
  dockedImagesByCategory,
  dockedImagesCount,
  baseCategoryCounts,
  usedImageCount,
  maxUsedImagesTotal,
  hasOverUsedLimit,
  categoriesOverUsedLimit,
  dragOverCategory,
  openImageMenuId,
  onOpenCreateCategory,
  onCategoryUsedDragOver,
  onCategoryUnusedDragOver,
  onCategoryRowDragLeave,
  onGlobalUnusedDockDragOver,
  onGlobalUnusedDockDragLeave,
  onOpenImageMenuChange,
  onRequestMoveImage,
  onRequestDeleteImage,
  handleDragStart,
  handleDragEnd,
  handleDropOnCategoryUsed,
  handleDropOnCategoryUnusedStrip,
  handleGlobalUnusedDockDrop
}: CategorizeImageWorkspaceProps) {
  const globalDockHighlight = dragOverCategory === UNUSED_DOCK_DROP_ZONE_ID;

  const defaultOpenCategories = React.useMemo(
    () => workspaceCategoryOrder,
    [workspaceCategoryOrder]
  );

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              hasOverUsedLimit
                ? "bg-destructive/10 text-destructive"
                : "bg-secondary text-muted-foreground"
            )}
          >
            {usedImageCount}/{maxUsedImagesTotal} used photos
          </div>
          {categoriesOverUsedLimit.length > 0 ? (
            <div className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
              {categoriesOverUsedLimit.length} room
              {categoriesOverUsedLimit.length === 1 ? "" : "s"} over the
              used-photo limit
            </div>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          className="shrink-0"
          onClick={onOpenCreateCategory}
        >
          Add Category
        </Button>
      </div>
      {images.length === 0 ? (
        <div className="mt-6 rounded-lg border border-border bg-secondary p-6 text-sm text-muted-foreground">
          No images uploaded yet.
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mt-6">
            <Accordion
              type="multiple"
              defaultValue={defaultOpenCategories}
              className="flex w-full flex-col rounded-lg border border-border"
            >
              {workspaceCategoryOrder.map((category, index) => {
                const used = usedImagesByCategory[category] ?? [];
                const unused = dockedImagesByCategory[category] ?? [];
                const usedHighlight =
                  dragOverCategory === categoryUsedDropZoneId(category);
                const unusedHighlight =
                  dragOverCategory === categoryDockDropZoneId(category);
                const label =
                  category === UNCATEGORIZED_CATEGORY_ID
                    ? "Uncategorized"
                    : formatCategoryLabel(category, baseCategoryCounts);

                return (
                  <AccordionItem
                    key={category}
                    value={category}
                    className={cn(
                      "rounded-none border-x-0 border-b-0 border-border px-3 shadow-none hover:shadow-none sm:px-4",
                      index === 0 ? "border-t-0" : "border-t"
                    )}
                  >
                    <AccordionTrigger className="py-3.5 text-sm font-medium hover:no-underline">
                      <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1 pr-2 text-left">
                        <span className="truncate">{label}</span>
                        <span className="text-xs font-normal text-muted-foreground">
                          {used.length} for video
                          {unused.length > 0
                            ? ` · ${unused.length} unused here`
                            : ""}
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-3 pt-0">
                      <div className="min-w-0 overflow-x-auto scrollbar-hide pb-1">
                        <div className="flex min-h-[7.25rem] min-w-min items-stretch gap-2">
                          <div
                            className={cn(
                              "flex shrink-0 items-center gap-2 rounded-lg border border-dashed px-2 py-2 transition-colors",
                              usedHighlight
                                ? "border-foreground/40 bg-secondary"
                                : "border-border/80 bg-card/20"
                            )}
                            onDragOver={(event) => {
                              event.preventDefault();
                              onCategoryUsedDragOver(category);
                            }}
                            onDragLeave={onCategoryRowDragLeave}
                            onDrop={handleDropOnCategoryUsed(category)}
                          >
                            {used.length > 0 ? (
                              used.map((image) => (
                                <CategorizeImageCard
                                  key={image.id}
                                  image={image}
                                  size="row"
                                  openImageMenuId={openImageMenuId}
                                  onOpenImageMenuChange={onOpenImageMenuChange}
                                  onRequestMoveImage={onRequestMoveImage}
                                  onRequestDeleteImage={onRequestDeleteImage}
                                  handleDragStart={handleDragStart}
                                  handleDragEnd={handleDragEnd}
                                />
                              ))
                            ) : (
                              <div className="flex min-w-[8rem] max-w-[14rem] items-center px-2 text-[11px] leading-snug text-muted-foreground">
                                Drag here to use in video (this room).
                              </div>
                            )}
                          </div>
                          <div
                            className="w-px shrink-0 self-stretch bg-border"
                            aria-hidden
                          />
                          <div
                            className={cn(
                              "flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-dashed px-2 py-2 transition-colors",
                              unusedHighlight
                                ? "border-foreground/40 bg-secondary"
                                : "border-border/60 bg-muted/15"
                            )}
                            onDragOver={(event) => {
                              event.preventDefault();
                              onCategoryUnusedDragOver(category);
                            }}
                            onDragLeave={onCategoryRowDragLeave}
                            onDrop={handleDropOnCategoryUnusedStrip(category)}
                          >
                            {unused.length > 0 ? (
                              unused.map((image) => (
                                <CategorizeImageCard
                                  key={image.id}
                                  image={image}
                                  size="row"
                                  visualVariant="muted"
                                  openImageMenuId={openImageMenuId}
                                  onOpenImageMenuChange={onOpenImageMenuChange}
                                  onRequestMoveImage={onRequestMoveImage}
                                  onRequestDeleteImage={onRequestDeleteImage}
                                  handleDragStart={handleDragStart}
                                  handleDragEnd={handleDragEnd}
                                />
                              ))
                            ) : (
                              <div className="flex min-w-[8rem] max-w-[14rem] items-center px-2 text-[11px] leading-snug text-muted-foreground">
                                Unused in this room — drag here from other rooms
                                or from video picks.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>

          <div className="mt-6">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Quick unused dock
            </p>
            <div
              className={cn(
                "relative flex min-h-20 items-center justify-center rounded-lg border border-dashed px-3 py-4 transition-colors",
                globalDockHighlight
                  ? "border-foreground/40 bg-secondary"
                  : "border-border bg-muted/20"
              )}
              onDragOver={(event) => {
                event.preventDefault();
                onGlobalUnusedDockDragOver();
              }}
              onDragLeave={onGlobalUnusedDockDragLeave}
              onDrop={handleGlobalUnusedDockDrop}
            >
              <p className="max-w-md text-center text-[11px] leading-relaxed text-muted-foreground">
                Drop here to remove a photo from &quot;used for video&quot; (it
                stays in its room, shown as unused in that room
                {dockedImagesCount > 0
                  ? ` — ${dockedImagesCount} not in video right now`
                  : ""}
                ). Drag from a room&apos;s unused lane into another room or into
                the left &quot;for video&quot; column to assign.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
