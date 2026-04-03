import * as React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@web/src/components/ui/accordion";
import { Badge } from "@web/src/components/ui/badge";
import { Button } from "@web/src/components/ui/button";
import { Film, Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@web/src/components/ui/tooltip";
import { cn } from "@web/src/components/ui/utils";
import { useScrollFade } from "@web/src/components/shared/hooks/useScrollFade";
import { formatCategoryLabel } from "@web/src/components/listings/stage/plan/domain/categoryRules";
import { getAvailableMotionVariants } from "@web/src/lib/domain/videoGeneration/cameraMotionOptions";
import {
  categoryUsedDropZoneId,
  UNCATEGORIZED_CATEGORY_ID,
  type ListingImageItem
} from "@web/src/components/listings/stage/plan/shared";
import { PlanImageCard } from "./PlanImageCard";
import type { CameraMotionVariantId } from "@shared/types/models";

type PlanImageWorkspaceProps = {
  images: ListingImageItem[];
  accordionCategoryOrder: string[];
  usedImagesByCategory: Record<string, ListingImageItem[]>;
  baseCategoryCounts: Record<string, number>;
  usedImageCount: number;
  maxUsedImagesTotal: number;
  hasOverUsedLimit: boolean;
  dragOverCategory: string | null;
  onOpenCreateCategory: () => void;
  onDeleteCategory: (category: string) => void;
  onCategoryUsedDragOver: (category: string) => void;
  onCategoryRowDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
  handleDragStart: (
    imageId: string
  ) => (event: React.DragEvent<HTMLDivElement>) => void;
  handleDragEnd: () => void;
  onSceneMotionChange: (
    imageId: string,
    motionVariantId: CameraMotionVariantId
  ) => void | Promise<void>;
  handleDropOnCategoryUsed: (
    category: string
  ) => (event: React.DragEvent<HTMLDivElement>) => void | Promise<void>;
};

type PlanWorkspaceCategoryRowProps = {
  category: string;
  used: ListingImageItem[];
  usedHighlight: boolean;
  onCategoryUsedDragOver: (category: string) => void;
  onCategoryRowDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
  handleDragStart: (
    imageId: string
  ) => (event: React.DragEvent<HTMLDivElement>) => void;
  handleDragEnd: () => void;
  onSceneMotionChange: (
    imageId: string,
    motionVariantId: CameraMotionVariantId
  ) => void | Promise<void>;
  handleDropOnCategoryUsed: (
    category: string
  ) => (event: React.DragEvent<HTMLDivElement>) => void | Promise<void>;
};

function PlanWorkspaceCategoryRow({
  category,
  used,
  usedHighlight,
  onCategoryUsedDragOver,
  onCategoryRowDragLeave,
  handleDragStart,
  handleDragEnd,
  onSceneMotionChange,
  handleDropOnCategoryUsed
}: PlanWorkspaceCategoryRowProps) {
  const { containerRef, maskImage } = useScrollFade();

  return (
    <div
      ref={containerRef}
      data-testid={`category-scroll-container-${category}`}
      className="min-w-0 overflow-x-auto [scrollbar-gutter:stable_both-edges] pb-1"
      style={
        maskImage ? { maskImage, WebkitMaskImage: maskImage } : undefined
      }
    >
      <div
        className={cn(
          "flex min-h-37 min-w-min items-stretch gap-2 rounded-lg border border-dashed px-2 py-2 transition-colors",
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
            <PlanImageCard
              key={image.id}
              image={image}
              size="categoryRow"
              handleDragStart={handleDragStart}
              handleDragEnd={handleDragEnd}
              motionOptions={getAvailableMotionVariants(
                image.category ?? category,
                image.metadata?.perspective
              )}
              onMotionChange={onSceneMotionChange}
            />
          ))
        ) : (
          <div className="flex min-w-32 max-w-56 items-center px-2 text-[11px] leading-snug text-muted-foreground">
            Drag an image here to use as a video starting frame for this room.
          </div>
        )}
      </div>
    </div>
  );
}

export function PlanImageWorkspace({
  images,
  accordionCategoryOrder,
  usedImagesByCategory,
  baseCategoryCounts,
  usedImageCount,
  maxUsedImagesTotal,
  hasOverUsedLimit,
  dragOverCategory,
  onOpenCreateCategory,
  onDeleteCategory,
  onCategoryUsedDragOver,
  onCategoryRowDragLeave,
  handleDragStart,
  handleDragEnd,
  onSceneMotionChange,
  handleDropOnCategoryUsed
}: PlanImageWorkspaceProps) {
  const [openCategories, setOpenCategories] = React.useState<string[]>(
    accordionCategoryOrder
  );

  React.useEffect(() => {
    setOpenCategories((current) => {
      const nextOpen = new Set(current);
      accordionCategoryOrder.forEach((category) => {
        if (!current.includes(category)) {
          nextOpen.add(category);
        }
      });
      const filtered = Array.from(nextOpen).filter((category) =>
        accordionCategoryOrder.includes(category)
      );
      return filtered.length === current.length &&
        filtered.every((category, index) => category === current[index])
        ? current
        : filtered;
    });
  }, [accordionCategoryOrder]);

  React.useEffect(() => {
    if (!dragOverCategory?.startsWith("category-used:")) {
      return;
    }
    const hoveredCategory = dragOverCategory.replace("category-used:", "");
    if (!accordionCategoryOrder.includes(hoveredCategory)) {
      return;
    }
    setOpenCategories((current) =>
      current.includes(hoveredCategory)
        ? current
        : [...current, hoveredCategory]
    );
  }, [accordionCategoryOrder, dragOverCategory]);

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          className="shrink-0"
          onClick={onOpenCreateCategory}
        >
          Add Room
        </Button>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          <Badge
            variant="muted"
            className={cn(
              "gap-1.5 rounded-full px-2 text-sm font-normal",
              hasOverUsedLimit
                ? "bg-warning/10 text-warning [&>svg]:text-warning"
                : "text-muted-foreground [&>svg]:text-muted-foreground"
            )}
          >
            <Film className="mt-0.5 h-4 w-4 shrink-0" />
            {usedImageCount}/{maxUsedImagesTotal} videos
          </Badge>
        </div>
      </div>
      {images.length === 0 ? (
        <div className="mt-6 rounded-lg border border-border bg-secondary p-6 text-sm text-muted-foreground">
          No images uploaded yet.
        </div>
      ) : (
        <div className="mt-6 flex min-h-0 flex-1 flex-col">
          <Accordion
            type="multiple"
            value={openCategories}
            onValueChange={setOpenCategories}
            className="flex w-full flex-col rounded-lg border border-border"
          >
            {accordionCategoryOrder.map((category, index) => {
              const used = usedImagesByCategory[category] ?? [];
              const usedHighlight =
                dragOverCategory === categoryUsedDropZoneId(category);
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
                  <div className="flex items-center gap-2">
                    <AccordionTrigger className="py-3.5 text-sm font-medium hover:no-underline [&>svg]:hidden">
                      <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1 pr-2 text-left">
                        <span className="truncate flex items-center gap-1">
                          {label}
                          <span className="text-sm font-normal text-muted-foreground/50">
                            |
                          </span>
                          <span className="text-sm font-normal text-muted-foreground">
                            {used.length} {used.length === 1 ? "scene" : "scenes"}
                          </span>
                        </span>
                      </span>
                    </AccordionTrigger>
                    <div className="ml-auto flex items-center gap-1 self-stretch">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 rounded-full text-muted-foreground hover:text-foreground"
                            aria-label={`Delete ${label}`}
                            onClick={() => {
                              onDeleteCategory(category);
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Delete room
                        </TooltipContent>
                      </Tooltip>
                      <AccordionTrigger
                        className="w-auto shrink-0 py-3.5 text-sm font-medium hover:no-underline [&>span]:hidden"
                        aria-label={`Toggle ${label}`}
                      />
                    </div>
                  </div>
                  <AccordionContent className="pb-3 pt-0">
                    <PlanWorkspaceCategoryRow
                      category={category}
                      used={used}
                      usedHighlight={usedHighlight}
                      onCategoryUsedDragOver={onCategoryUsedDragOver}
                      onCategoryRowDragLeave={onCategoryRowDragLeave}
                      handleDragStart={handleDragStart}
                      handleDragEnd={handleDragEnd}
                      onSceneMotionChange={onSceneMotionChange}
                      handleDropOnCategoryUsed={handleDropOnCategoryUsed}
                    />
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      )}
    </section>
  );
}
