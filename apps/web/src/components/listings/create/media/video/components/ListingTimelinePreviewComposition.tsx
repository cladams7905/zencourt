"use client";

import * as React from "react";
import { AbsoluteFill, Sequence, Video, useVideoConfig } from "remotion";
import type {
  PreviewTextOverlay,
  PreviewTimelineSegment
} from "@web/src/lib/video/previewTimeline";
import {
  PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR,
  PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR_OPAQUE,
  PREVIEW_TEXT_OVERLAY_POSITION_TOP,
  PREVIEW_TEXT_OVERLAY_LAYOUT,
  PREVIEW_TEXT_OVERLAY_MAX_WIDTH,
  PREVIEW_TEXT_OVERLAY_BORDER_RADIUS,
  PREVIEW_TEXT_OVERLAY_TEXT_COLOR,
  computeOverlayLineStyles,
  pickSandwichOverlayArrowPath
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
  transitionDurationSeconds: number;
}

const PREMOUNT_FRAMES = 15;
const POSTMOUNT_FRAMES = 5;

function TextOverlay({
  overlay,
  topOverride,
  baseFontSizePxOverride
}: {
  overlay: PreviewTextOverlay;
  topOverride?: string;
  baseFontSizePxOverride?: number;
}) {
  const hasBackground = overlay.background !== "none";
  const backgroundColor =
    overlay.templatePattern === "simple"
      ? PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR_OPAQUE[overlay.background]
      : PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR[overlay.background];
  const layout = PREVIEW_TEXT_OVERLAY_LAYOUT.video;
  const lineStyles = computeOverlayLineStyles(
    overlay,
    baseFontSizePxOverride ?? layout.fontSizePx
  );
  const overlayTop =
    topOverride ?? PREVIEW_TEXT_OVERLAY_POSITION_TOP[overlay.position];
  const shouldCenterByPosition = !topOverride && overlay.position === "center";
  const arrowPath = pickSandwichOverlayArrowPath(overlay);

  return (
    <div
      style={{
        position: "absolute",
        top: overlayTop,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        paddingLeft: layout.horizontalPaddingPx,
        paddingRight: layout.horizontalPaddingPx,
        pointerEvents: "none",
        transform: shouldCenterByPosition ? "translateY(-50%)" : undefined
      }}
    >
      <div
        style={{
          maxWidth: PREVIEW_TEXT_OVERLAY_MAX_WIDTH,
          borderRadius: PREVIEW_TEXT_OVERLAY_BORDER_RADIUS,
          backgroundColor,
          padding: hasBackground
            ? `${layout.boxPaddingVerticalPx}px ${layout.boxPaddingHorizontalPx}px`
            : "0",
          color: PREVIEW_TEXT_OVERLAY_TEXT_COLOR[overlay.background],
          textAlign: "center"
        }}
      >
        {lineStyles.map((line, i) => (
          <div
            key={i}
            style={{
              fontFamily: line.fontFamily,
              fontWeight: line.fontWeight,
              fontSize: line.fontSize,
              textTransform: line.textTransform,
              fontStyle: line.fontStyle,
              lineHeight: line.lineHeight,
              letterSpacing: line.letterSpacing,
              textShadow: line.textShadow,
              marginTop: line.marginTop,
              marginBottom: line.marginBottom
            }}
          >
            {line.text.startsWith("📍 ")
              ? line.text.replace(/^📍\s+/, "📍\u00A0\u00A0")
              : line.text}
          </div>
        ))}
        {arrowPath ? (
          <img
            src={arrowPath}
            alt=""
            aria-hidden
            style={{
              display: "block",
              margin: "3px auto 0",
              width: 220,
              maxWidth: "100%",
              opacity: 0.95,
              filter:
                "invert(1) drop-shadow(0 2px 6px rgba(0, 0, 0, 0.45))"
            }}
          />
        ) : null}
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
                <TextOverlay overlay={segment.textOverlay} />
              ) : null}
              {segment.supplementalAddressOverlay ? (
                <TextOverlay
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
