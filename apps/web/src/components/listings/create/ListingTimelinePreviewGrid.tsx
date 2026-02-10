"use client";

import * as React from "react";
import { Player } from "@remotion/player";
import { Download, Edit, Heart } from "lucide-react";
import { Button } from "../../ui/button";
import { cn } from "../../ui/utils";
import type { ContentItem } from "../../dashboard/ContentGrid";
import type { PreviewTimelinePlan } from "@web/src/lib/video/previewTimeline";
import { LoadingImage } from "../../ui/loading-image";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "../../ui/dialog";
import {
  ListingTimelinePreviewComposition,
  getTimelineDurationInFrames,
  type TimelinePreviewResolvedSegment
} from "./ListingTimelinePreviewComposition";

type ListingTimelinePreviewGridProps = {
  plans: PreviewTimelinePlan[];
  items: ContentItem[];
  captionItems: ContentItem[];
  captionSubcategoryLabel: string;
};

type PlayablePreview = {
  id: string;
  resolvedSegments: TimelinePreviewResolvedSegment[];
  firstThumb: string | null;
  durationInFrames: number;
  captionItem: ContentItem | null;
  variationNumber: number;
};

const PREVIEW_FPS = 30;
const PREVIEW_TRANSITION_SECONDS = 0;

export function ListingTimelinePreviewGrid({
  plans,
  items,
  captionItems,
  captionSubcategoryLabel
}: ListingTimelinePreviewGridProps) {
  const [activePlanId, setActivePlanId] = React.useState<string | null>(null);
  const [revealedPlanId, setRevealedPlanId] = React.useState<string | null>(
    null
  );
  const [selectedPlanId, setSelectedPlanId] = React.useState<string | null>(
    null
  );
  const [favoritePlanIds, setFavoritePlanIds] = React.useState<Set<string>>(
    new Set()
  );
  const revealTimerRef = React.useRef<number | null>(null);

  const itemById = React.useMemo(
    () =>
      new Map(
        items.map((item) => [
          item.id,
          {
            id: item.id,
            videoUrl: item.videoUrl ?? null,
            thumbnail: item.thumbnail ?? null
          }
        ])
      ),
    [items]
  );

  const playablePlans = React.useMemo<PlayablePreview[]>(() => {
    const resolved = plans.map<PlayablePreview | null>((plan, index) => {
      const resolvedSegments: TimelinePreviewResolvedSegment[] = plan.segments
        .map((segment) => {
          const source = itemById.get(segment.clipId);
          if (!source?.videoUrl) {
            return null;
          }
          return {
            ...segment,
            src: source.videoUrl
          };
        })
        .filter((segment): segment is TimelinePreviewResolvedSegment =>
          Boolean(segment)
        );
      if (resolvedSegments.length < 2) {
        return null;
      }
      const firstThumb =
        itemById.get(resolvedSegments[0].clipId)?.thumbnail ?? null;
      const durationInFrames = getTimelineDurationInFrames(
        resolvedSegments,
        PREVIEW_FPS,
        PREVIEW_TRANSITION_SECONDS
      );
      return {
        id: `${plan.id}-${resolvedSegments.length}`,
        resolvedSegments,
        firstThumb,
        durationInFrames,
        captionItem: captionItems.at(index) ?? null,
        variationNumber: index + 1
      };
    });
    return resolved.filter((plan): plan is PlayablePreview => Boolean(plan));
  }, [captionItems, itemById, plans]);

  const clearRevealTimer = React.useCallback(() => {
    if (revealTimerRef.current !== null) {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  }, []);

  const handlePlanEnter = React.useCallback(
    (planId: string) => {
      clearRevealTimer();
      setActivePlanId(planId);
      setRevealedPlanId(null);
      revealTimerRef.current = window.setTimeout(() => {
        setRevealedPlanId(planId);
        revealTimerRef.current = null;
      }, 120);
    },
    [clearRevealTimer]
  );

  const handlePlanLeave = React.useCallback(() => {
    clearRevealTimer();
    setActivePlanId(null);
    setRevealedPlanId(null);
  }, [clearRevealTimer]);

  React.useEffect(() => {
    return () => clearRevealTimer();
  }, [clearRevealTimer]);

  if (playablePlans.length === 0) {
    return null;
  }

  const selectedPreview =
    playablePlans.find((preview) => preview.id === selectedPlanId) ?? null;

  return (
    <>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 xl:grid-cols-4">
        {playablePlans.map((preview) => {
          const isActive = activePlanId === preview.id;
          const isRevealed = revealedPlanId === preview.id;
          return (
            <div
              key={preview.id}
              className="group overflow-hidden rounded-xl bg-card shadow-sm"
              onMouseEnter={() => handlePlanEnter(preview.id)}
              onMouseLeave={handlePlanLeave}
              onClick={() => setSelectedPlanId(preview.id)}
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
                      setFavoritePlanIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(preview.id)) {
                          next.delete(preview.id);
                        } else {
                          next.add(preview.id);
                        }
                        return next;
                      });
                    }}
                    className={cn(
                      "h-6 w-6 rounded-full border backdrop-blur-md transition-all",
                      favoritePlanIds.has(preview.id)
                        ? "bg-primary/90 border-primary text-primary-foreground hover:bg-primary"
                        : "bg-background/20 border-background/30 text-background hover:bg-background/30 hover:border-background/70"
                    )}
                    aria-label="Favorite reel preview"
                  >
                    <Heart
                      className={cn(
                        "h-3.5 w-3.5",
                        favoritePlanIds.has(preview.id) && "fill-current"
                      )}
                    />
                  </Button>
                </div>
                <div className="relative aspect-9/16 w-full bg-card">
                  {preview.firstThumb ? (
                    <LoadingImage
                      src={preview.firstThumb}
                      alt="Reel preview"
                      fill
                      unoptimized
                      sizes="(min-width: 1024px) 24vw, (min-width: 768px) 32vw, 100vw"
                      className="object-cover"
                    />
                  ) : null}
                  {isActive ? (
                    <Player
                      component={ListingTimelinePreviewComposition}
                      inputProps={{
                        segments: preview.resolvedSegments,
                        transitionDurationSeconds: PREVIEW_TRANSITION_SECONDS
                      }}
                      durationInFrames={preview.durationInFrames}
                      compositionWidth={1080}
                      compositionHeight={1920}
                      fps={PREVIEW_FPS}
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
        })}
      </div>

      <Dialog
        open={Boolean(selectedPreview)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPlanId(null);
          }
        }}
      >
        <DialogContent className="h-[80vh] w-[60vw] max-w-[calc(100vw-2rem)] sm:max-w-[1600px] grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Reel Preview</DialogTitle>
          </DialogHeader>
          {selectedPreview ? (
            <div className="grid h-full min-h-0 gap-6 md:grid-cols-[minmax(0,1fr)_490px]">
              <div className="flex min-h-0 items-center justify-center overflow-hidden rounded-lg bg-card">
                <div className="relative h-full aspect-9/16 w-auto">
                  <Player
                    component={ListingTimelinePreviewComposition}
                    inputProps={{
                      segments: selectedPreview.resolvedSegments,
                      transitionDurationSeconds: PREVIEW_TRANSITION_SECONDS
                    }}
                    durationInFrames={selectedPreview.durationInFrames}
                    compositionWidth={1080}
                    compositionHeight={1920}
                    fps={PREVIEW_FPS}
                    loop
                    autoPlay
                    controls
                    initiallyMuted
                    renderPoster={() =>
                      selectedPreview.firstThumb ? (
                        <LoadingImage
                          src={selectedPreview.firstThumb}
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
                    style={{ width: "100%", height: "100%" }}
                    acknowledgeRemotionLicense
                  />
                </div>
              </div>
              <div className="min-h-0 overflow-y-auto rounded-lg border border-border bg-card p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {captionSubcategoryLabel} Caption · Variation{" "}
                  {selectedPreview.variationNumber}
                </p>
                <div className="mt-4 space-y-4">
                  {selectedPreview.captionItem?.hook ? (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">
                        Hook
                      </p>
                      <p className="text-sm text-foreground">
                        {selectedPreview.captionItem.hook}
                      </p>
                    </div>
                  ) : null}

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">
                      Caption
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm text-foreground">
                      {selectedPreview.captionItem?.caption?.trim()
                        ? selectedPreview.captionItem.caption
                        : "No caption available yet for this subcategory."}
                    </p>
                  </div>

                  {selectedPreview.captionItem?.body?.length ? (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">
                        Slide Notes
                      </p>
                      <div className="mt-2 space-y-2">
                        {selectedPreview.captionItem.body.map(
                          (slide, index) => (
                            <p
                              key={`${selectedPreview.captionItem?.id}-slide-${index}`}
                              className="text-xs text-muted-foreground"
                            >
                              {index + 1}. {slide.header}: {slide.content}
                            </p>
                          )
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
