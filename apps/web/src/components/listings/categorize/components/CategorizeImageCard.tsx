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
import { MoreHorizontal, Move, Star, Trash2 } from "lucide-react";
import type { ListingImageItem } from "@web/src/components/listings/categorize/shared";

type CategorizeImageCardProps = {
  image: ListingImageItem;
  openImageMenuId: string | null;
  onOpenImageMenuChange: (imageId: string | null) => void;
  onRequestMoveImage: (imageId: string) => void;
  onRequestDeleteImage: (imageId: string) => void;
  handleSetPrimaryImage: (imageId: string) => void | Promise<void>;
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
  handleSetPrimaryImage,
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
      {image.isPrimary ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="absolute top-2 left-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-primary/40 text-primary-foreground backdrop-blur-lg">
              <Star className="h-4 w-4" />
              <span className="sr-only">Primary</span>
            </div>
          </TooltipTrigger>
          <TooltipContent sideOffset={6}>
            Primary image — used as the starting <br />
            frame for video generation.
          </TooltipContent>
        </Tooltip>
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
              disabled={!image.category || image.isPrimary || undefined}
              onSelect={(event) => {
                event.preventDefault();
                handleSetPrimaryImage(image.id);
              }}
            >
              <Star size={12} />
              {image.isPrimary ? "Primary photo" : "Set as primary"}
            </DropdownMenuItem>
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
