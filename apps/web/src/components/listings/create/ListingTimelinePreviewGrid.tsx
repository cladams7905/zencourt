"use client";

import * as React from "react";
import { Player } from "@remotion/player";
import { Play } from "lucide-react";
import type { ContentItem } from "../../dashboard/ContentGrid";
import type { PreviewTimelinePlan } from "@web/src/lib/video/previewTimeline";
import { LoadingImage } from "../../ui/loading-image";
import {
  ListingTimelinePreviewComposition,
  getTimelineDurationInFrames,
  type TimelinePreviewResolvedSegment
} from "./ListingTimelinePreviewComposition";

type ListingTimelinePreviewGridProps = {
  plans: PreviewTimelinePlan[];
  items: ContentItem[];
};

const PREVIEW_FPS = 30;
const PREVIEW_TRANSITION_SECONDS = 0.45;

function formatVariantLabel(variant: PreviewTimelinePlan["variant"]): string {
  switch (variant) {
    case "cinematic":
      return "Cinematic";
    case "energetic":
      return "Energetic";
    case "luxury-flow":
      return "Luxury Flow";
    default:
      return variant;
  }
}

export function ListingTimelinePreviewGrid({
  plans,
  items
}: ListingTimelinePreviewGridProps) {
  const [activePlanId, setActivePlanId] = React.useState<string | null>(null);

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

  const playablePlans = React.useMemo(() => {
    return plans
      .map((plan) => {
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
          id: `${plan.variant}-${resolvedSegments.length}`,
          plan,
          resolvedSegments,
          firstThumb,
          durationInFrames
        };
      })
      .filter(
        (
          plan
        ): plan is {
          id: string;
          plan: PreviewTimelinePlan;
          resolvedSegments: TimelinePreviewResolvedSegment[];
          firstThumb: string | null;
          durationInFrames: number;
        } => Boolean(plan)
      );
  }, [itemById, plans]);

  if (playablePlans.length === 0) {
    return null;
  }

  return (
    <div className="mb-10">
      <div className="mb-4 space-y-1">
        <h3 className="text-lg font-semibold text-foreground">Reel previews</h3>
        <p className="text-xs text-muted-foreground">
          Hover a card to preview a stitched timeline with dynamic transitions.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {playablePlans.map((preview) => {
          const isActive = activePlanId === preview.id;
          return (
            <div
              key={preview.id}
              className="group overflow-hidden rounded-xl border border-border bg-background shadow-xs"
              onMouseEnter={() => setActivePlanId(preview.id)}
              onMouseLeave={() => setActivePlanId(null)}
              onClick={() =>
                setActivePlanId((current) =>
                  current === preview.id ? null : preview.id
                )
              }
            >
              <div className="relative aspect-9/16 w-full bg-black">
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
                    clickToPlay={false}
                    doubleClickToFullscreen={false}
                    spaceKeyToPlayOrPause={false}
                    style={{ width: "100%", height: "100%" }}
                    acknowledgeRemotionLicense
                  />
                ) : (
                  <>
                    {preview.firstThumb ? (
                      <LoadingImage
                        src={preview.firstThumb}
                        alt={`${formatVariantLabel(preview.plan.variant)} preview`}
                        fill
                        sizes="(min-width: 1024px) 24vw, (min-width: 768px) 32vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-black/20 transition-colors duration-300 group-hover:bg-black/35" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-black/45 text-white">
                        <Play className="h-4 w-4 fill-current" />
                      </span>
                    </div>
                  </>
                )}
              </div>
              <div className="space-y-1 p-3">
                <p className="text-sm font-medium text-foreground">
                  {formatVariantLabel(preview.plan.variant)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {preview.resolvedSegments.length} clips •{" "}
                  {preview.plan.totalDurationSeconds.toFixed(1)}s
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
