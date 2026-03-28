import * as React from "react";
import type { VideoPreviewTimelineLayoutItem } from "@web/src/components/listings/create/media/video/videoPreviewTimelineViewModel";

type VideoPreviewTimelineRulerProps = {
  totalDurationSeconds: number;
  totalFrames: number;
  contentWidthPx: number;
  layoutItems: VideoPreviewTimelineLayoutItem[];
};

export function VideoPreviewTimelineRuler({
  totalDurationSeconds,
  totalFrames,
  contentWidthPx,
  layoutItems
}: VideoPreviewTimelineRulerProps) {
  if (
    contentWidthPx <= 0 ||
    totalFrames <= 0 ||
    totalDurationSeconds <= 0 ||
    layoutItems.length === 0
  ) {
    return null;
  }

  const ticks = [];
  const tickCount = Math.floor(totalDurationSeconds * 10);
  for (let tickIndex = 0; tickIndex <= tickCount; tickIndex += 1) {
    const seconds = tickIndex / 10;
    const frame = Math.round((seconds / totalDurationSeconds) * totalFrames);
    const item =
      layoutItems.find((layoutItem) => frame <= layoutItem.endFrame) ??
      layoutItems[layoutItems.length - 1]!;
    const ratio =
      item.endFrame === item.startFrame
        ? 0
        : (frame - item.startFrame) / (item.endFrame - item.startFrame);
    const leftPx = item.startPx + Math.max(0, Math.min(1, ratio)) * item.widthPx;
    const isSecondMark = tickIndex % 10 === 0;
    ticks.push(
      <div
        key={`tick-${tickIndex}`}
        className="absolute bottom-0"
        style={{ left: `${leftPx}px` }}
      >
        <div
          className={isSecondMark ? "h-4 w-px bg-border" : "h-2.5 w-px bg-border/70"}
        />
        {isSecondMark ? (
          <span className="absolute top-0 left-1 text-[10px] text-muted-foreground">
            {seconds.toFixed(0)}s
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div
      data-testid="timeline-ruler"
      className="relative h-6 border-t border-border/80"
      style={{ width: `${contentWidthPx}px` }}
    >
      {ticks}
    </div>
  );
}
