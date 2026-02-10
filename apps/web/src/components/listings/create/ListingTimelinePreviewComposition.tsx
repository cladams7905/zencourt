"use client";

import * as React from "react";
import {
  AbsoluteFill,
  Sequence,
  Video,
  useVideoConfig
} from "remotion";
import type {
  PreviewTextOverlay,
  PreviewTimelineSegment
} from "@web/src/lib/video/previewTimeline";
import {
  PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR,
  PREVIEW_TEXT_OVERLAY_FONT_FAMILY,
  PREVIEW_TEXT_OVERLAY_POSITION_TOP,
  PREVIEW_TEXT_OVERLAY_LAYOUT,
  PREVIEW_TEXT_OVERLAY_MAX_WIDTH,
  PREVIEW_TEXT_OVERLAY_BORDER_RADIUS,
  PREVIEW_TEXT_OVERLAY_TEXT_COLOR,
  PREVIEW_TEXT_OVERLAY_LINE_HEIGHT,
  PREVIEW_TEXT_OVERLAY_LETTER_SPACING,
  PREVIEW_TEXT_OVERLAY_NO_BACKGROUND_TEXT_SHADOW
} from "@shared/utils";

export interface TimelinePreviewResolvedSegment extends PreviewTimelineSegment {
  src: string;
}

export interface ListingTimelinePreviewCompositionProps {
  segments: TimelinePreviewResolvedSegment[];
  transitionDurationSeconds: number;
}

const PREMOUNT_FRAMES = 15;
const POSTMOUNT_FRAMES = 5;

function TextOverlay({ overlay }: { overlay: PreviewTextOverlay }) {
  const hasBackground = overlay.background !== "none";
  return (
    <div
      style={{
        position: "absolute",
        top: PREVIEW_TEXT_OVERLAY_POSITION_TOP[overlay.position],
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        paddingLeft: PREVIEW_TEXT_OVERLAY_LAYOUT.video.horizontalPaddingPx,
        paddingRight: PREVIEW_TEXT_OVERLAY_LAYOUT.video.horizontalPaddingPx,
        pointerEvents: "none"
      }}
    >
      <div
        style={{
          maxWidth: PREVIEW_TEXT_OVERLAY_MAX_WIDTH,
          borderRadius: hasBackground ? PREVIEW_TEXT_OVERLAY_BORDER_RADIUS : 0,
          backgroundColor: PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR[overlay.background],
          padding: hasBackground ? `${PREVIEW_TEXT_OVERLAY_LAYOUT.video.boxPaddingVerticalPx}px ${PREVIEW_TEXT_OVERLAY_LAYOUT.video.boxPaddingHorizontalPx}px` : "0",
          color: PREVIEW_TEXT_OVERLAY_TEXT_COLOR,
          textAlign: "center",
          fontFamily: PREVIEW_TEXT_OVERLAY_FONT_FAMILY[overlay.font],
          fontSize: PREVIEW_TEXT_OVERLAY_LAYOUT.video.fontSizePx,
          lineHeight: PREVIEW_TEXT_OVERLAY_LINE_HEIGHT,
          letterSpacing: PREVIEW_TEXT_OVERLAY_LETTER_SPACING,
          textShadow: hasBackground
            ? "none"
            : PREVIEW_TEXT_OVERLAY_NO_BACKGROUND_TEXT_SHADOW
        }}
      >
        {overlay.text}
      </div>
    </div>
  );
}

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
              <Video
                src={segment.src}
                pauseWhenBuffering
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              {segment.textOverlay ? <TextOverlay overlay={segment.textOverlay} /> : null}
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
