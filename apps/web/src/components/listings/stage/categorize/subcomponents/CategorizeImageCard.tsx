import * as React from "react";
import { Button } from "@web/src/components/ui/button";
import { cn } from "@web/src/components/ui/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@web/src/components/ui/dropdown-menu";
import { LoadingImage } from "@web/src/components/ui/loading-image";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@web/src/components/ui/tooltip";
import { MoreHorizontal, Move, Sparkles, Trash2 } from "lucide-react";
import type { ListingImageItem } from "@web/src/components/listings/stage/categorize/shared";

type CategorizeImageCardSize = "accordion" | "strip" | "dock" | "row";

type CategorizeImageCardProps = {
  image: ListingImageItem;
  size?: CategorizeImageCardSize;
  /** Muted styling for unused / not-selected-for-video thumbnails in a room row. */
  visualVariant?: "default" | "muted";
  openImageMenuId: string | null;
  onOpenImageMenuChange: (imageId: string | null) => void;
  onRequestMoveImage: (imageId: string) => void;
  onRequestDeleteImage: (imageId: string) => void;
  handleDragStart: (
    imageId: string
  ) => (event: React.DragEvent<HTMLDivElement>) => void;
  handleDragEnd: () => void;
};

export function CategorizeImageCard({
  image,
  size = "accordion",
  visualVariant = "default",
  openImageMenuId,
  onOpenImageMenuChange,
  onRequestMoveImage,
  onRequestDeleteImage,
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
          "shrink-0 aspect-3/4 h-28 w-[4.75rem] sm:h-32 sm:w-24",
        visualVariant === "muted" &&
          "opacity-55 saturate-[0.35] contrast-95 ring-1 ring-border/70"
      )}
      draggable
      onDragStart={handleDragStart(image.id)}
      onDragEnd={handleDragEnd}
    >
      {typeof image.recommendationScore === "number" ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="absolute top-2 left-2 z-10 flex min-w-12 items-center justify-center gap-1 rounded-full bg-primary/40 px-2 py-1 text-primary-foreground backdrop-blur-lg">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold">
                {Math.round(image.recommendationScore * 100)}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent sideOffset={6}>
            Recommended score for video source selection.
          </TooltipContent>
        </Tooltip>
      ) : null}
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
      <div
        className={`absolute top-2 right-2 z-10 transition-opacity ${
          openImageMenuId === image.id
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <DropdownMenu
          open={openImageMenuId === image.id}
          onOpenChange={(open) => onOpenImageMenuChange(open ? image.id : null)}
        >
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full bg-background/70 backdrop-blur-sm hover:bg-background"
              aria-label="Photo options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8}>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                onRequestMoveImage(image.id);
              }}
            >
              <Move size={12} />
              Move to category
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1.5 bg-border/50" />
            <DropdownMenuItem
              variant="destructive"
              onSelect={(event) => {
                event.preventDefault();
                onRequestDeleteImage(image.id);
              }}
            >
              <Trash2 size={12} />
              Delete photo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
