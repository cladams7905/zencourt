import * as React from "react";
import { Move, VideoIcon } from "lucide-react";
import { cn } from "@web/src/components/ui/utils";
import { LoadingImage } from "@web/src/components/ui/loading-image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger
} from "@web/src/components/ui/select";
import type { ListingImageItem } from "@web/src/components/listings/stage/categorize/shared";
import type { CameraMotionVariantId } from "@shared/types/models";

type CategorizeImageCardSize =
  | "accordion"
  | "strip"
  | "dock"
  | "row"
  /** Taller thumbnails inside room accordions (categorize workspace). */
  | "categoryRow";

type CategorizeImageCardProps = {
  image: ListingImageItem;
  size?: CategorizeImageCardSize;
  /** Muted styling for unused / not-selected-for-video thumbnails in a room row. */
  visualVariant?: "default" | "muted";
  handleDragStart: (
    imageId: string
  ) => (event: React.DragEvent<HTMLDivElement>) => void;
  handleDragEnd: () => void;
  motionOptions?: Array<{
    id: CameraMotionVariantId;
    label: string;
    description: string;
  }>;
  onMotionChange?: (
    imageId: string,
    motionVariantId: CameraMotionVariantId
  ) => void;
};

const MOTION_PREVIEW_VIDEO_SRC =
  "https://cdn.zencourt.ai/zencourt-media-dev/assets/example-videos/exterior-front-v1.mp4";
const MOTION_PREVIEW_POSTER_SRC =
  "https://cdn.zencourt.ai/zencourt-media-dev/assets/example-videos/pexels-photo-106399.jpeg";

function MotionPreviewVideo({
  className,
  isActive
}: {
  className?: string;
  isActive?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md border border-border/70 bg-secondary/40",
        className
      )}
      aria-hidden
    >
      <LoadingImage
        src={MOTION_PREVIEW_POSTER_SRC}
        alt=""
        fill
        loading="lazy"
        className="pointer-events-none h-full w-full object-cover"
      />
      {isActive ? (
        <video
          key={MOTION_PREVIEW_VIDEO_SRC}
          src={MOTION_PREVIEW_VIDEO_SRC}
          poster={MOTION_PREVIEW_POSTER_SRC}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          preload="none"
        />
      ) : null}
    </div>
  );
}

function DragMoveHint({ size }: { size: CategorizeImageCardSize }) {
  const compact = size === "dock";
  return (
    <div
      className={cn(
        "pointer-events-none absolute z-10 inline-flex items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm backdrop-blur-md supports-backdrop-filter:bg-background/90",
        compact ? "right-0.5 top-0.5 size-5" : "right-1 top-1 size-6"
      )}
      aria-hidden
    >
      <Move className={cn("shrink-0", compact ? "size-3" : "size-3.5")} />
    </div>
  );
}

export function CategorizeImageCard({
  image,
  size = "accordion",
  visualVariant = "default",
  handleDragStart,
  handleDragEnd,
  motionOptions,
  onMotionChange
}: CategorizeImageCardProps) {
  const [isMotionMenuOpen, setIsMotionMenuOpen] = React.useState(false);
  const [activePreviewMotionId, setActivePreviewMotionId] =
    React.useState<CameraMotionVariantId | null>(null);
  const selectedMotionVariantId =
    image.metadata?.videoScene?.motionVariantId ?? "default";
  const hasMotionSelector = Boolean(motionOptions && onMotionChange);
  const resolvedMotionOptions = motionOptions ?? [];
  const selectedMotionOption =
    resolvedMotionOptions.find(
      (option) => option.id === selectedMotionVariantId
    ) ?? resolvedMotionOptions[0];
  const handleMotionValueChange = (value: string) => {
    if (!onMotionChange) {
      return;
    }

    onMotionChange(image.id, value as CameraMotionVariantId);
  };

  const handleMotionMenuOpenChange = (open: boolean) => {
    setIsMotionMenuOpen(open);
    if (!open) {
      setActivePreviewMotionId(null);
    }
  };

  return (
    <div
      className={cn(
        "group relative cursor-grab overflow-hidden rounded-lg border border-border bg-secondary/40",
        size === "accordion" &&
          "mx-auto aspect-3/4 w-full max-w-19 sm:max-w-21",
        size === "strip" &&
          "shrink-0 aspect-3/4 h-[min(50vh,20rem)] w-[min(78vw,12.5rem)] sm:h-[min(52vh,22rem)] sm:w-[min(42vw,14rem)] md:w-[min(36vw,15rem)]",
        size === "dock" && "shrink-0 aspect-3/4 w-16 sm:w-18",
        size === "row" && "shrink-0 aspect-3/4 h-32 w-24 sm:h-40 sm:w-30",
        size === "categoryRow" && "shrink-0 w-36 sm:w-40",
        visualVariant === "muted" &&
          "opacity-55 saturate-[0.35] contrast-95 ring-1 ring-border/70"
      )}
      draggable
      onDragStart={handleDragStart(image.id)}
      onDragEnd={handleDragEnd}
    >
      <div
        className={cn(
          "relative overflow-hidden",
          size === "accordion" &&
            "aspect-3/4 w-full max-w-19 rounded-lg sm:max-w-21",
          size === "strip" &&
            "aspect-3/4 h-[min(50vh,20rem)] w-[min(78vw,12.5rem)] rounded-lg sm:h-[min(52vh,22rem)] sm:w-[min(42vw,14rem)] md:w-[min(36vw,15rem)]",
          size === "dock" && "aspect-3/4 w-16 rounded-lg sm:w-18",
          size === "row" && "aspect-3/4 h-32 w-24 rounded-lg sm:h-40 sm:w-30",
          size === "categoryRow" &&
            cn(
              "aspect-3/4 w-full",
              hasMotionSelector ? "rounded-t-lg rounded-b-none" : "rounded-lg"
            )
        )}
      >
        <DragMoveHint size={size} />
        <LoadingImage
          src={image.url}
          alt={image.filename}
          className="h-full w-full object-cover object-center transition-transform duration-200 ease-out group-hover:scale-[1.03]"
          fill
        />
      </div>
      {hasMotionSelector ? (
        <div
          className="border-t rounded-b-lg border-border bg-background"
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
        >
          <Select
            value={selectedMotionVariantId}
            onValueChange={handleMotionValueChange}
            onOpenChange={handleMotionMenuOpenChange}
          >
            <SelectTrigger
              size="sm"
              className="h-12 w-full rounded-t-none border-0 bg-transparent px-3 text-left shadow-none focus-visible:ring-0"
              aria-label={`Camera motion for ${image.filename}`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <VideoIcon strokeWidth={1} className="size-4 shrink-0" />
                <span className="min-w-0 truncate text-sm font-medium">
                  {selectedMotionOption?.label ?? "Camera motion"}
                </span>
              </span>
            </SelectTrigger>
            <SelectContent className="w-[20rem] p-0" viewportClassName="p-0">
              {resolvedMotionOptions.map((option, index) => (
                <React.Fragment key={option.id}>
                  <SelectItem
                    value={option.id}
                    className="items-start gap-3 rounded-none px-3 py-3 text-left"
                    onPointerEnter={() => {
                      if (isMotionMenuOpen) {
                        setActivePreviewMotionId(option.id);
                      }
                    }}
                    onPointerLeave={() => {
                      setActivePreviewMotionId((current) =>
                        current === option.id ? null : current
                      );
                    }}
                    onFocus={() => {
                      if (isMotionMenuOpen) {
                        setActivePreviewMotionId(option.id);
                      }
                    }}
                    onBlur={() => {
                      setActivePreviewMotionId((current) =>
                        current === option.id ? null : current
                      );
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <MotionPreviewVideo
                        className="mt-0.5 aspect-[9/16] h-20 shrink-0 rounded-lg"
                        isActive={activePreviewMotionId === option.id}
                      />
                      <div className="flex min-w-0 flex-col justify-center">
                        <span className="text-sm font-medium">
                          {option.label}
                        </span>
                        <span className="mt-0.5 text-xs leading-snug text-muted-foreground">
                          {option.description}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                  {index < resolvedMotionOptions.length - 1 ? (
                    <SelectSeparator className="mx-0 my-0" />
                  ) : null}
                </React.Fragment>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  );
}
