import * as React from "react";
import { cn } from "@web/src/components/ui/utils";
import { LoadingImage } from "@web/src/components/ui/loading-image";
import type { ListingImageItem } from "@web/src/components/listings/stage/categorize/shared";

type CategorizeImageCardSize = "accordion" | "strip" | "dock" | "row";

type CategorizeImageCardProps = {
  image: ListingImageItem;
  size?: CategorizeImageCardSize;
  /** Muted styling for unused / not-selected-for-video thumbnails in a room row. */
  visualVariant?: "default" | "muted";
  handleDragStart: (
    imageId: string
  ) => (event: React.DragEvent<HTMLDivElement>) => void;
  handleDragEnd: () => void;
};

export function CategorizeImageCard({
  image,
  size = "accordion",
  visualVariant = "default",
  handleDragStart,
  handleDragEnd
}: CategorizeImageCardProps) {
  return (
    <div
      className={cn(
        "group relative cursor-grab overflow-hidden rounded-lg border border-border bg-secondary/40",
        size === "accordion" &&
          "mx-auto aspect-3/4 w-full max-w-19 sm:max-w-21",
        size === "strip" &&
          "shrink-0 aspect-3/4 h-[min(50vh,20rem)] w-[min(78vw,12.5rem)] sm:h-[min(52vh,22rem)] sm:w-[min(42vw,14rem)] md:w-[min(36vw,15rem)]",
        size === "dock" && "shrink-0 aspect-3/4 w-16 sm:w-18",
        size === "row" &&
          "shrink-0 aspect-3/4 h-32 w-24 sm:h-40 sm:w-30",
        visualVariant === "muted" &&
          "opacity-55 saturate-[0.35] contrast-95 ring-1 ring-border/70"
      )}
      draggable
      onDragStart={handleDragStart(image.id)}
      onDragEnd={handleDragEnd}
    >
      <div className="absolute bottom-2 left-2 z-10 flex max-w-[calc(100%-1rem)] flex-wrap gap-1">
        {image.shotType === "detail" ? (
          <div className="rounded-full bg-background/80 px-2 py-1 text-[11px] font-medium text-foreground backdrop-blur-sm">
            Detail shot
          </div>
        ) : null}
        {image.isOther ? (
          <div className="rounded-full bg-amber-500/80 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            Other
          </div>
        ) : null}
        {image.isUncategorized ? (
          <div className="rounded-full bg-destructive/90 px-2 py-1 text-[11px] font-medium text-destructive-foreground backdrop-blur-sm">
            Uncategorized
          </div>
        ) : null}
      </div>
      <LoadingImage
        src={image.url}
        alt={image.filename}
        className="h-full w-full object-cover object-center transition-transform duration-200 ease-out group-hover:scale-[1.03]"
        fill
      />
    </div>
  );
}
