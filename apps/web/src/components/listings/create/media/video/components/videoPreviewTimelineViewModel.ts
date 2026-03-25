import type { TimelinePreviewResolvedSegment } from "@web/src/components/listings/create/media/video/components/ListingTimelinePreviewComposition";

export type VideoPreviewTimelineItem = {
  id: string;
  label: string;
  durationLabel: string;
  widthPercent: number;
  thumbnailSrc: string | null;
  frameCount: number;
};

function toTitleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDurationLabel(durationSeconds: number): string {
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

  return segments.map((segment, index) => ({
    id: `${segment.clipId}-${index}`,
    label: toTitleCase(segment.category?.trim() || segment.clipId),
    durationLabel: formatDurationLabel(segment.durationSeconds),
    widthPercent: (segment.durationSeconds / safeTotalDuration) * 100,
    thumbnailSrc: segment.thumbnailSrc ?? null,
    frameCount: Math.max(2, Math.round(segment.durationSeconds * 1.5))
  }));
}
