import * as React from "react";
import { LoadingImage } from "@web/src/components/ui/loading-image";
import type { TimelinePreviewResolvedSegment } from "@web/src/components/listings/create/media/video/components/ListingTimelinePreviewComposition";
import { useScrollFade } from "@web/src/components/listings/create/shared/hooks/useScrollFade";
import { buildVideoPreviewTimelineItems } from "@web/src/components/listings/create/media/video/components/videoPreviewTimelineViewModel";

type VideoPreviewTimelineProps = {
  segments: TimelinePreviewResolvedSegment[];
};

export function VideoPreviewTimeline({ segments }: VideoPreviewTimelineProps) {
  const items = React.useMemo(
    () => buildVideoPreviewTimelineItems(segments),
    [segments]
  );
  const { containerRef, maskImage } = useScrollFade();

  if (items.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Video timeline"
      className="min-w-0 rounded-xl bg-card/70 xl:flex xl:h-full xl:min-h-0 xl:flex-col"
    >
      <div className="mb-2 flex items-center justify-between px-1 xl:shrink-0">
        <p className="text-sm font-semibold text-foreground">Timeline</p>
        <p className="text-xs text-muted-foreground">
          {items.length} clips
        </p>
      </div>
      <div
        ref={containerRef}
        className="-mx-1 overflow-x-auto pb-2 xl:min-h-0 xl:flex-1"
        style={
          maskImage
            ? { maskImage, WebkitMaskImage: maskImage }
            : undefined
        }
      >
        <div className="flex min-w-max items-stretch gap-2 px-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-lg border border-border bg-background"
              style={{
                width: `${Math.max(180, item.widthPercent * 6)}px`,
                flex: "0 0 auto"
              }}
            >
              <div
                className="flex h-16 min-w-0 items-stretch overflow-hidden border-b border-border/80 bg-muted/30"
              >
                {Array.from({ length: item.frameCount }, (_, frameIndex) => (
                  <div
                    key={`${item.id}-frame-${frameIndex}`}
                    className="relative min-w-0 flex-1 border-r border-border/70 last:border-r-0"
                  >
                    {item.thumbnailSrc ? (
                      <LoadingImage
                        src={item.thumbnailSrc}
                        alt={`${item.label} clip thumbnail`}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-muted" />
                    )}
                  </div>
                ))}
              </div>
              <div className="px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.label}
                  </p>
                  <p className="shrink-0 text-xs text-muted-foreground">
                    {item.durationLabel}
                  </p>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground/70"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
