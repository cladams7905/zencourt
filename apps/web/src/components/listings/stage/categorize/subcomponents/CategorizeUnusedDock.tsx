import * as React from "react";
import { Images, AlertTriangle } from "lucide-react";
import type { ListingImageItem } from "@web/src/components/listings/stage/categorize/shared";
import { UNUSED_DOCK_DROP_ZONE_ID } from "@web/src/components/listings/stage/categorize/shared";
import { CategorizeImageCard } from "./CategorizeImageCard";

type CategorizeUnusedDockProps = {
  dockedImages: ListingImageItem[];
  dragOverCategory: string | null;
  openImageMenuId: string | null;
  usedImageCount: number;
  maxUsedImagesTotal: number;
  uncategorizedDockCount: number;
  hasOverUsedLimit: boolean;
  onOpenImageMenuChange: (imageId: string | null) => void;
  onRequestMoveImage: (imageId: string) => void;
  onRequestDeleteImage: (imageId: string) => void;
  onDockDragOver: () => void;
  onDockDragLeave: () => void;
  handleDragStart: (
    imageId: string
  ) => (event: React.DragEvent<HTMLDivElement>) => void;
  handleDragEnd: () => void;
  handleDockDrop: (
    event: React.DragEvent<HTMLDivElement>
  ) => void | Promise<void>;
};

export function CategorizeUnusedDock({
  dockedImages,
  dragOverCategory,
  openImageMenuId,
  usedImageCount,
  maxUsedImagesTotal,
  uncategorizedDockCount,
  hasOverUsedLimit,
  onOpenImageMenuChange,
  onRequestMoveImage,
  onRequestDeleteImage,
  onDockDragOver,
  onDockDragLeave,
  handleDragStart,
  handleDragEnd,
  handleDockDrop
}: CategorizeUnusedDockProps) {
  return (
    <section className="sticky bottom-0 z-10 mt-auto border-t border-border bg-background/95 pb-2 pt-4 backdrop-blur">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground">
            <Images className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Unused Photos
            </h3>
            <p className="text-xs text-muted-foreground">
              Drag photos into a room to use them, or drag used photos here to dock them.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div
            className={`rounded-full px-3 py-1 font-medium ${
              hasOverUsedLimit
                ? "bg-destructive/10 text-destructive"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {usedImageCount}/{maxUsedImagesTotal} used
          </div>
          {uncategorizedDockCount > 0 ? (
            <div className="rounded-full bg-destructive/10 px-3 py-1 font-medium text-destructive">
              {uncategorizedDockCount} uncategorized
            </div>
          ) : null}
        </div>
      </div>
      {hasOverUsedLimit || uncategorizedDockCount > 0 ? (
        <div className="mb-3 flex flex-col gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-3 text-xs text-destructive">
          {hasOverUsedLimit ? (
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
              <span>
                Reduce the used photos to {maxUsedImagesTotal} or fewer before continuing.
              </span>
            </div>
          ) : null}
          {uncategorizedDockCount > 0 ? (
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
              <span>Categorize every uncategorized photo before continuing.</span>
            </div>
          ) : null}
        </div>
      ) : null}
      <div
        className={`overflow-x-auto rounded-xl border border-dashed px-3 py-3 transition-colors ${
          dragOverCategory === UNUSED_DOCK_DROP_ZONE_ID
            ? "border-foreground/40 bg-secondary"
            : "border-border bg-card"
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          onDockDragOver();
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            onDockDragLeave();
          }
        }}
        onDrop={handleDockDrop}
      >
        {dockedImages.length > 0 ? (
          <div className="flex min-w-full gap-3 pb-1">
            {dockedImages.map((image) => (
              <CategorizeImageCard
                key={image.id}
                image={image}
                context="dock"
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
            Drag used photos here to remove them from the recommended set.
          </div>
        )}
      </div>
    </section>
  );
}
