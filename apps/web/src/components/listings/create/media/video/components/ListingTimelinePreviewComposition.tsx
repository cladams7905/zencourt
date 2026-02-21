"use client";

import * as React from "react";
import { AbsoluteFill, Sequence, Video, useVideoConfig } from "remotion";
import type {
  PreviewTextOverlay,
  PreviewTimelineSegment
} from "@web/src/components/listings/create/domain/previewTimeline";
import {
  PreviewTextOverlayRenderer,
  PREVIEW_TEXT_OVERLAY_POSITION_TOP,
  PREVIEW_TEXT_OVERLAY_LAYOUT
} from "@shared/utils";

export interface TimelinePreviewResolvedSegment extends PreviewTimelineSegment {
  src: string;
  supplementalAddressOverlay?: {
    overlay: PreviewTextOverlay;
    placement: "bottom-third" | "below-primary" | "low-bottom";
  };
}

export interface ListingTimelinePreviewCompositionProps {
  segments: TimelinePreviewResolvedSegment[];
}

const PREMOUNT_FRAMES = 15;
const POSTMOUNT_FRAMES = 5;

export function getTimelineDurationInFrames(
  segments: TimelinePreviewResolvedSegment[],
  fps: number
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
        const clipFrames = Math.max(
          1,
          Math.round(segment.durationSeconds * fps)
        );
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
              <Video
                src={segment.src}
                pauseWhenBuffering
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              {segment.textOverlay ? (
                <PreviewTextOverlayRenderer overlay={segment.textOverlay} />
              ) : null}
              {segment.supplementalAddressOverlay ? (
                <PreviewTextOverlayRenderer
                  overlay={segment.supplementalAddressOverlay.overlay}
                  topOverride={
                    segment.supplementalAddressOverlay.placement ===
                    "below-primary"
                      ? "79%"
                      : segment.supplementalAddressOverlay.placement ===
                          "low-bottom"
                        ? "84%"
                        : PREVIEW_TEXT_OVERLAY_POSITION_TOP["bottom-third"]
                  }
                  baseFontSizePxOverride={
                    PREVIEW_TEXT_OVERLAY_LAYOUT.video.fontSizePx * 0.58
                  }
                />
              ) : null}
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
