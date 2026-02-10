"use client";

import * as React from "react";
import {
  AbsoluteFill,
  Sequence,
  Video,
  useVideoConfig
} from "remotion";
import type { PreviewTimelineSegment } from "@web/src/lib/video/previewTimeline";

export interface TimelinePreviewResolvedSegment extends PreviewTimelineSegment {
  src: string;
}

export interface ListingTimelinePreviewCompositionProps {
  segments: TimelinePreviewResolvedSegment[];
  transitionDurationSeconds: number;
}

const PREMOUNT_FRAMES = 15;
const POSTMOUNT_FRAMES = 5;

export function getTimelineDurationInFrames(
  segments: TimelinePreviewResolvedSegment[],
  fps: number,
  _transitionDurationSeconds: number = 0
): number {
  if (segments.length === 0) {
    return 1;
  }
  return segments.reduce((acc, segment) => {
    return acc + Math.max(1, Math.round(segment.durationSeconds * fps));
  }, 0);
}

export const ListingTimelinePreviewComposition: React.FC<
  ListingTimelinePreviewCompositionProps
> = ({ segments }) => {
  const { fps } = useVideoConfig();

  let cursor = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {segments.map((segment, index) => {
        const clipFrames = Math.max(1, Math.round(segment.durationSeconds * fps));
        const startFrame = cursor;
        cursor += clipFrames;

        return (
          <Sequence
            key={`${segment.clipId}-${index}`}
            from={startFrame}
            durationInFrames={clipFrames}
            premountFor={PREMOUNT_FRAMES}
            postmountFor={POSTMOUNT_FRAMES}
          >
            <AbsoluteFill>
              <Video src={segment.src} pauseWhenBuffering />
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
