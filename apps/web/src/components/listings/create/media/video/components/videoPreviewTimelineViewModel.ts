import type { TimelinePreviewResolvedSegment } from "@web/src/components/listings/create/media/video/components/ListingTimelinePreviewComposition";

export type VideoPreviewTimelineItem = {
  id: string;
  label: string;
  durationSeconds: number;
  durationLabel: string;
  widthPercent: number;
  widthPx: number;
  thumbnailSrc: string | null;
  frameCount: number;
  maxDurationSeconds: number;
};

export type VideoPreviewTimelineLayoutItem = VideoPreviewTimelineItem & {
  index: number;
  startPx: number;
  endPx: number;
  startFrame: number;
  endFrame: number;
  frameCount: number;
};

export const TIMELINE_CARD_GAP_PX = 0;
export const TIMELINE_PIXELS_PER_SECOND = 64;

function toTitleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatDurationLabel(durationSeconds: number): string {
  const rounded = Number(durationSeconds.toFixed(1));
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}s`;
}

export function buildVideoPreviewTimelineItems(
  segments: TimelinePreviewResolvedSegment[]
): VideoPreviewTimelineItem[] {
  const totalDuration = segments.reduce(
    (sum, segment) => sum + segment.durationSeconds,
    0
  );
  const safeTotalDuration = totalDuration > 0 ? totalDuration : segments.length;

  return segments.map((segment, index) => {
    const widthPercent = (segment.durationSeconds / safeTotalDuration) * 100;
    return {
      id: `${segment.clipId}-${index}`,
      label: toTitleCase(segment.category?.trim() || segment.clipId),
      durationSeconds: segment.durationSeconds,
      durationLabel: formatDurationLabel(segment.durationSeconds),
      widthPercent,
      widthPx: Math.round(segment.durationSeconds * TIMELINE_PIXELS_PER_SECOND),
      thumbnailSrc: segment.thumbnailSrc ?? null,
      frameCount: Math.max(2, Math.round(segment.durationSeconds * 1.5)),
      maxDurationSeconds: segment.maxDurationSeconds
    };
  });
}

export function buildVideoPreviewTimelineLayout(params: {
  items: VideoPreviewTimelineItem[];
  fps: number;
  gapPx?: number;
}): { items: VideoPreviewTimelineLayoutItem[]; contentWidthPx: number } {
  const gapPx = params.gapPx ?? TIMELINE_CARD_GAP_PX;
  let cursorPx = 0;
  let cursorFrame = 0;

  const items = params.items.map((item, index) => {
    const actualFrameCount = Math.max(
      1,
      Math.round(item.durationSeconds * params.fps)
    );
    const layoutItem: VideoPreviewTimelineLayoutItem = {
      ...item,
      index,
      startPx: cursorPx,
      endPx: cursorPx + item.widthPx,
      startFrame: cursorFrame,
      endFrame: cursorFrame + actualFrameCount,
      frameCount: actualFrameCount
    };
    cursorPx += item.widthPx + gapPx;
    cursorFrame += actualFrameCount;
    return layoutItem;
  });

  return {
    items,
    contentWidthPx:
      items.length === 0 ? 0 : items[items.length - 1]!.endPx
  };
}

export function getPlayheadOffsetPx(params: {
  currentFrame: number;
  layoutItems: VideoPreviewTimelineLayoutItem[];
  contentWidthPx: number;
}): number {
  const { currentFrame, layoutItems, contentWidthPx } = params;
  if (layoutItems.length === 0) {
    return 0;
  }

  const clampedFrame = Math.max(0, currentFrame);
  for (const item of layoutItems) {
    if (clampedFrame <= item.endFrame) {
      const localFrames = Math.max(0, clampedFrame - item.startFrame);
      const ratio =
        item.endFrame === item.startFrame
          ? 0
          : localFrames / (item.endFrame - item.startFrame);
      return item.startPx + ratio * item.widthPx;
    }
  }

  return contentWidthPx;
}

export function getFrameFromTimelineOffset(params: {
  offsetPx: number;
  layoutItems: VideoPreviewTimelineLayoutItem[];
  contentWidthPx: number;
}): number {
  const { layoutItems, contentWidthPx } = params;
  const clampedOffset = Math.max(0, Math.min(params.offsetPx, contentWidthPx));

  for (const item of layoutItems) {
    if (clampedOffset <= item.endPx) {
      const ratio =
        item.widthPx === 0 ? 0 : (clampedOffset - item.startPx) / item.widthPx;
      const safeRatio = Math.max(0, Math.min(1, ratio));
      return Math.round(
        item.startFrame + safeRatio * (item.endFrame - item.startFrame)
      );
    }
  }

  return layoutItems[layoutItems.length - 1]?.endFrame ?? 0;
}
