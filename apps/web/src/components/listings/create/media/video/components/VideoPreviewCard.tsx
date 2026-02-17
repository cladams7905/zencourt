import * as React from "react";
import { Player } from "@remotion/player";
import { Download, Edit, Heart } from "lucide-react";
import { toast } from "sonner";
import { PREVIEW_TEXT_OVERLAY_LAYOUT, PREVIEW_TEXT_OVERLAY_POSITION_TOP } from "@shared/utils";
import { Button } from "@web/src/components/ui/button";
import { cn } from "@web/src/components/ui/utils";
import { LoadingImage } from "@web/src/components/ui/loading-image";
import { ListingTimelinePreviewComposition } from "@web/src/components/listings/create/media/video/components/ListingTimelinePreviewComposition";
import type { PlayablePreview } from "@web/src/components/listings/create/shared/types";
import { VideoThumbnailTextOverlay } from "@web/src/components/listings/create/media/video/components/VideoThumbnailTextOverlay";

type VideoPreviewCardProps = {
  preview: PlayablePreview;
  isActive: boolean;
  isRevealed: boolean;
  isFavorite: boolean;
  previewFps: number;
  previewTransitionSeconds: number;
  onEnter: () => void;
  onLeave: () => void;
  onSelect: () => void;
  onToggleFavorite: () => void;
};

export function VideoPreviewCard({
  preview,
  isActive,
  isRevealed,
  isFavorite,
  previewFps,
  previewTransitionSeconds,
  onEnter,
  onLeave,
  onSelect,
  onToggleFavorite
}: VideoPreviewCardProps) {
  return (
    <div
      className="group overflow-hidden rounded-xl bg-card shadow-sm"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onSelect}
    >
      <div className="relative overflow-hidden">
        <div className="absolute right-3 top-3 z-10 flex gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <Button
            size="icon"
            variant="ghost"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              toast("Edit controls will be added here.");
            }}
            className="h-6 w-6 rounded-full border border-background/30 bg-background/20 text-background backdrop-blur-md hover:bg-background/30 hover:border-background/70"
            aria-label="Edit reel preview"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const sourceUrl = preview.resolvedSegments[0]?.src;
              if (!sourceUrl) {
                toast.error("No clip available to download.");
                return;
              }
              window.open(sourceUrl, "_blank", "noopener,noreferrer");
            }}
            className="h-6 w-6 rounded-full border border-background/30 bg-background/20 text-background backdrop-blur-md hover:bg-background/30 hover:border-background/70"
            aria-label="Download reel preview"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleFavorite();
            }}
            className={cn(
              "h-6 w-6 rounded-full border backdrop-blur-md transition-all",
              isFavorite
                ? "bg-primary/90 border-primary text-primary-foreground hover:bg-primary"
                : "bg-background/20 border-background/30 text-background hover:bg-background/30 hover:border-background/70"
            )}
            aria-label="Favorite reel preview"
          >
            <Heart className={cn("h-3.5 w-3.5", isFavorite && "fill-current")} />
          </Button>
        </div>
        <div className="relative aspect-9/16 w-full bg-card">
          {preview.firstThumb ? (
            <LoadingImage
              src={preview.firstThumb}
              alt="Reel preview"
              fill
              unoptimized
              blurClassName=""
              sizes="(min-width: 1024px) 24vw, (min-width: 768px) 32vw, 100vw"
              className="object-cover"
            />
          ) : null}
          {preview.thumbnailOverlay ? (
            <VideoThumbnailTextOverlay overlay={preview.thumbnailOverlay} />
          ) : null}
          {preview.thumbnailAddressOverlay ? (
            <VideoThumbnailTextOverlay
              overlay={preview.thumbnailAddressOverlay.overlay}
              topOverride={
                preview.thumbnailAddressOverlay.placement === "below-primary"
                  ? "79%"
                  : preview.thumbnailAddressOverlay.placement === "low-bottom"
                    ? "84%"
                    : PREVIEW_TEXT_OVERLAY_POSITION_TOP["bottom-third"]
              }
              baseFontSizePxOverride={PREVIEW_TEXT_OVERLAY_LAYOUT.video.fontSizePx * 0.58}
            />
          ) : null}
          {isActive ? (
            <Player
              component={ListingTimelinePreviewComposition}
              inputProps={{
                segments: preview.resolvedSegments,
                transitionDurationSeconds: previewTransitionSeconds
              }}
              durationInFrames={preview.durationInFrames}
              compositionWidth={1080}
              compositionHeight={1920}
              fps={previewFps}
              loop
              autoPlay
              controls={false}
              initiallyMuted
              renderPoster={() =>
                preview.firstThumb ? (
                  <LoadingImage
                    src={preview.firstThumb}
                    alt="Reel preview"
                    fill
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover"
                    }}
                  />
                ) : null
              }
              showPosterWhenUnplayed
              showPosterWhenBuffering
              showPosterWhenBufferingAndPaused
              clickToPlay={false}
              doubleClickToFullscreen={false}
              spaceKeyToPlayOrPause={false}
              style={{
                width: "100%",
                height: "100%",
                opacity: isRevealed ? 1 : 0,
                transition: "opacity 120ms ease"
              }}
              acknowledgeRemotionLicense
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
