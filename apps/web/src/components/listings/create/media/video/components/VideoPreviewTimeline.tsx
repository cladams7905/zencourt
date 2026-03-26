import * as React from "react";
import { Clapperboard } from "lucide-react";
import { LoadingImage } from "@web/src/components/ui/loading-image";
import type { TimelinePreviewResolvedSegment } from "@web/src/components/listings/create/media/video/components/ListingTimelinePreviewComposition";
import { useScrollFade } from "@web/src/components/listings/create/shared/hooks/useScrollFade";
import { useHorizontalDragAutoScroll } from "@web/src/components/listings/create/shared/hooks/useHorizontalDragAutoScroll";
import { VideoPreviewTimelineRuler } from "@web/src/components/listings/create/media/video/components/VideoPreviewTimelineRuler";
import {
  TIMELINE_CARD_GAP_PX,
  buildVideoPreviewTimelineItems,
  buildVideoPreviewTimelineLayout,
  getFrameFromTimelineOffset,
  getPlayheadOffsetPx
} from "@web/src/components/listings/create/media/video/components/videoPreviewTimelineViewModel";

type VideoPreviewTimelineProps = {
  segments: TimelinePreviewResolvedSegment[];
  previewFps: number;
  currentFrame: number;
  totalFrames: number;
  onSeekFrame?: (frame: number) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  onDurationChange?: (index: number, durationSeconds: number) => void;
};

const MIN_CLIP_DURATION_SECONDS = 2;
const RESIZE_PIXELS_PER_SECOND = 48;
type ResizeEdge = "left" | "right";
type ResizeState = {
  itemId: string;
  index: number;
  edge: ResizeEdge;
  startClientX: number;
  startDurationSeconds: number;
  maxDurationSeconds: number;
};

export function VideoPreviewTimeline({
  segments,
  previewFps,
  currentFrame,
  totalFrames,
  onSeekFrame,
  onReorder,
  onDurationChange
}: VideoPreviewTimelineProps) {
  const items = React.useMemo(
    () => buildVideoPreviewTimelineItems(segments),
    [segments]
  );
  const { items: layoutItems, contentWidthPx } = React.useMemo(
    () => buildVideoPreviewTimelineLayout({ items, fps: previewFps }),
    [items, previewFps]
  );
  const { containerRef, maskImage } = useScrollFade();
  const [draggedItemId, setDraggedItemId] = React.useState<string | null>(null);
  const [resizeState, setResizeState] = React.useState<ResizeState | null>(
    null
  );
  const [isScrubbing, setIsScrubbing] = React.useState(false);
  useHorizontalDragAutoScroll({
    enabled: Boolean(onReorder && draggedItemId),
    containerRef,
    onDragSessionEnd: React.useCallback(() => setDraggedItemId(null), [])
  });

  React.useEffect(() => {
    if (!resizeState || !onDurationChange) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const deltaX = event.clientX - resizeState.startClientX;
      const directionalDelta = resizeState.edge === "left" ? -deltaX : deltaX;
      const nextDuration = Number(
        Math.min(
          resizeState.maxDurationSeconds,
          Math.max(
            MIN_CLIP_DURATION_SECONDS,
            resizeState.startDurationSeconds +
              directionalDelta / RESIZE_PIXELS_PER_SECOND
          )
        ).toFixed(2)
      );

      onDurationChange(resizeState.index, nextDuration);
    };

    const handleMouseUp = () => {
      setResizeState(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onDurationChange, resizeState]);

  const playheadOffsetPx = React.useMemo(
    () =>
      getPlayheadOffsetPx({
        currentFrame,
        layoutItems,
        contentWidthPx
      }),
    [contentWidthPx, currentFrame, layoutItems]
  );

  const seekFromClientX = React.useCallback(
    (clientX: number) => {
      if (!onSeekFrame || !containerRef.current) {
        return;
      }
      const rect = containerRef.current.getBoundingClientRect();
      const offsetPx = clientX - rect.left + containerRef.current.scrollLeft;
      const frame = getFrameFromTimelineOffset({
        offsetPx,
        layoutItems,
        contentWidthPx
      });
      onSeekFrame(Math.max(0, Math.min(totalFrames, frame)));
    },
    [containerRef, contentWidthPx, layoutItems, onSeekFrame, totalFrames]
  );

  React.useEffect(() => {
    if (!isScrubbing) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      seekFromClientX(event.clientX);
    };
    const handleMouseUp = () => {
      setIsScrubbing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isScrubbing, seekFromClientX]);

  if (items.length === 0) {
    return null;
  }

  const totalDurationSeconds = totalFrames / previewFps;

  return (
    <section
      aria-label="Video timeline"
      className="min-w-0 rounded-xl bg-card/70 xl:flex xl:h-full xl:min-h-0 xl:flex-col"
    >
      <div className="mb-4 flex items-center justify-between px-1 xl:shrink-0">
        <p className="text-sm font-semibold text-foreground">Timeline</p>
        <div className="inline-flex h-7 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
          <Clapperboard className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {items.length} clips
        </div>
      </div>
      <div
        ref={containerRef}
        className="-mx-1 overflow-x-auto overflow-y-hidden pb-2 xl:min-h-0 xl:flex-1"
        style={
          maskImage ? { maskImage, WebkitMaskImage: maskImage } : undefined
        }
      >
        <div
          className="relative min-w-max pt-5"
          style={{ width: `${contentWidthPx}px` }}
        >
          <div
            data-testid="timeline-playhead"
            data-current-frame={currentFrame}
            className="absolute top-0 z-20 w-px bg-red-500"
            style={{
              left: `${playheadOffsetPx}px`,
              top: "0",
              height: "100%"
            }}
          >
            <button
              type="button"
              aria-label="Scrub timeline playhead"
              className="absolute top-0 -left-[5px] h-2.5 w-2.5 cursor-ew-resize rounded-full bg-red-500"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsScrubbing(true);
                seekFromClientX(event.clientX);
              }}
            />
          </div>
          <div
            className="mt-2 flex items-stretch"
            style={{ gap: `${TIMELINE_CARD_GAP_PX}px` }}
            onMouseDown={(event) => {
              if (!(event.target instanceof HTMLElement)) {
                return;
              }
              if (event.target.dataset.resizeHandle === "true") {
                return;
              }
              setIsScrubbing(true);
              seekFromClientX(event.clientX);
            }}
          >
            {items.map((item, index) => (
              <div
                key={item.id}
                draggable={Boolean(onReorder)}
                onDragStart={() => setDraggedItemId(item.id)}
                onDragEnd={() => setDraggedItemId(null)}
                onDragOver={(event) => {
                  if (onReorder) {
                    event.preventDefault();
                  }
                }}
                onDrop={(event) => {
                  if (!onReorder || !draggedItemId) {
                    return;
                  }
                  event.preventDefault();
                  const fromIndex = items.findIndex(
                    (timelineItem) => timelineItem.id === draggedItemId
                  );
                  onReorder(fromIndex, index);
                  setDraggedItemId(null);
                }}
                data-testid={`timeline-clip-${item.id}`}
                className="group relative box-border overflow-hidden border border-border bg-background first:rounded-l-lg last:rounded-r-lg not-first:border-l-0"
                style={{
                  width: `${item.widthPx}px`,
                  flex: "0 0 auto",
                  borderColor:
                    draggedItemId === item.id
                      ? "hsl(var(--primary))"
                      : undefined
                }}
              >
                <button
                  type="button"
                  data-testid={`timeline-resize-left-${item.id}`}
                  aria-label={`Resize ${item.label} from left edge`}
                  className="absolute inset-y-0 left-0 z-10 w-2 cursor-ew-resize bg-transparent"
                  data-resize-handle="true"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setResizeState({
                      itemId: item.id,
                      index,
                      edge: "left",
                      startClientX: event.clientX,
                      startDurationSeconds:
                        segments[index]?.durationSeconds ??
                        MIN_CLIP_DURATION_SECONDS,
                      maxDurationSeconds: item.maxDurationSeconds
                    });
                  }}
                />
                <div className="grid grid-cols-[minmax(0,1fr)_0px] transition-[grid-template-columns] duration-150 group-hover:grid-cols-[minmax(0,1fr)_16px]">
                  <div>
                    <div className="flex h-16 min-w-0 items-stretch overflow-hidden border-b border-border/80 bg-muted/30">
                      {Array.from(
                        { length: item.frameCount },
                        (_, frameIndex) => (
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
                        )
                      )}
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
                    </div>
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex h-full items-center justify-center border-l border-primary bg-primary opacity-0 transition-opacity group-hover:opacity-100">
                      <div
                        className="grid grid-cols-2 place-items-center gap-x-0.5 gap-y-0.5"
                        aria-hidden
                      >
                        {Array.from({ length: 8 }, (_, dotIndex) => (
                          <span
                            key={`${item.id}-dot-${dotIndex}`}
                            className="h-0.5 w-0.5 rounded-full bg-background"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid={`timeline-resize-right-${item.id}`}
                  aria-label={`Resize ${item.label} from right edge`}
                  className="absolute inset-y-0 right-4 z-10 w-2 cursor-ew-resize bg-transparent"
                  data-resize-handle="true"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setResizeState({
                      itemId: item.id,
                      index,
                      edge: "right",
                      startClientX: event.clientX,
                      startDurationSeconds:
                        segments[index]?.durationSeconds ??
                        MIN_CLIP_DURATION_SECONDS,
                      maxDurationSeconds: item.maxDurationSeconds
                    });
                  }}
                />
              </div>
            ))}
          </div>
          <div
            className="mt-2"
            onMouseDown={(event) => {
              setIsScrubbing(true);
              seekFromClientX(event.clientX);
            }}
          >
            <VideoPreviewTimelineRuler
              totalDurationSeconds={totalDurationSeconds}
              totalFrames={totalFrames}
              contentWidthPx={contentWidthPx}
              layoutItems={layoutItems}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
