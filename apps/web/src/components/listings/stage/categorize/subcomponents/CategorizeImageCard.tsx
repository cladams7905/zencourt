import * as React from "react";
import { Button } from "@web/src/components/ui/button";
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

type CategorizeImageCardProps = {
  image: ListingImageItem;
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
  openImageMenuId,
  onOpenImageMenuChange,
  onRequestMoveImage,
  onRequestDeleteImage,
  handleDragStart,
  handleDragEnd
}: CategorizeImageCardProps) {
  return (
    <div
      className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-secondary/40 cursor-grab"
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
      {image.shotType === "detail" ? (
        <div className="absolute bottom-2 left-2 z-10 rounded-full bg-background/80 px-2 py-1 text-[11px] font-medium text-foreground backdrop-blur-sm">
          Detail shot
        </div>
      ) : null}
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
        className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
        fill
      />
    </div>
  );
}
