"use client";

import * as React from "react";
import {
  AbsoluteFill,
  Sequence,
  Video,
  interpolate,
  useCurrentFrame,
  useVideoConfig
} from "remotion";
import type {
  PreviewTimelineSegment,
  PreviewTransition
} from "@web/src/lib/video/previewTimeline";

export interface TimelinePreviewResolvedSegment extends PreviewTimelineSegment {
  src: string;
}

export interface ListingTimelinePreviewCompositionProps {
  segments: TimelinePreviewResolvedSegment[];
  transitionDurationSeconds: number;
}

const FALLBACK_TRANSITION_DURATION_SECONDS = 0.45;

function getClipStartFrames(
  segments: TimelinePreviewResolvedSegment[],
  fps: number,
  transitionFrames: number
): number[] {
  const starts: number[] = [];
  let cursor = 0;

  for (let i = 0; i < segments.length; i += 1) {
    starts.push(cursor);
    const clipFrames = Math.max(1, Math.round(segments[i].durationSeconds * fps));
    cursor += clipFrames;
    if (i < segments.length - 1) {
      cursor -= transitionFrames;
    }
  }

  return starts;
}

function applyTransitionStyles(args: {
  transition: PreviewTransition;
  progress: number;
  direction: "in" | "out";
  opacity: number;
  transformParts: string[];
  style: React.CSSProperties;
}): number {
  const { transition, progress, direction, opacity, transformParts, style } = args;
  const entering = direction === "in";

  switch (transition) {
    case "crossfade":
      return opacity * (entering ? progress : 1 - progress);
    case "slide-left":
      transformParts.push(
        `translateX(${entering ? (1 - progress) * 12 : -progress * 12}%)`
      );
      return opacity * (entering ? progress : 1 - progress * 0.75);
    case "push":
      transformParts.push(
        `scale(${entering ? 1.06 - 0.06 * progress : 1 + 0.06 * progress})`
      );
      return opacity * (entering ? progress : 1 - progress);
    case "light-flash":
      style.filter = `brightness(${entering ? 1.35 - 0.35 * progress : 1 + 0.35 * progress})`;
      return opacity * (entering ? progress : 1 - progress);
    case "zoom-settle":
      transformParts.push(
        `scale(${entering ? 1.12 - 0.12 * progress : 1 - 0.08 * progress})`
      );
      return opacity * (entering ? progress : 1 - progress);
    case "wipe": {
      const percent = entering ? (1 - progress) * 100 : progress * 100;
      style.clipPath = `inset(0 ${percent}% 0 0)`;
      return opacity;
    }
    default:
      return opacity;
  }
}

export function getTimelineDurationInFrames(
  segments: TimelinePreviewResolvedSegment[],
  fps: number,
  transitionDurationSeconds: number = FALLBACK_TRANSITION_DURATION_SECONDS
): number {
  if (segments.length === 0) {
    return 1;
  }
  const transitionFrames = Math.max(1, Math.round(transitionDurationSeconds * fps));
  const startFrames = getClipStartFrames(segments, fps, transitionFrames);
  const lastIndex = segments.length - 1;
  const lastSegmentFrames = Math.max(
    1,
    Math.round(segments[lastIndex].durationSeconds * fps)
  );
  return startFrames[lastIndex] + lastSegmentFrames;
}

export const ListingTimelinePreviewComposition: React.FC<
  ListingTimelinePreviewCompositionProps
> = ({ segments, transitionDurationSeconds }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const normalizedTransitionSeconds =
    transitionDurationSeconds || FALLBACK_TRANSITION_DURATION_SECONDS;
  const transitionFrames = Math.max(
    1,
    Math.round(normalizedTransitionSeconds * fps)
  );
  const startFrames = getClipStartFrames(segments, fps, transitionFrames);

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {segments.map((segment, index) => {
        const clipFrames = Math.max(1, Math.round(segment.durationSeconds * fps));
        const startFrame = startFrames[index];
        const localFrame = frame - startFrame;

        const incomingTransition = index > 0 ? segments[index - 1].transitionToNext : undefined;
        const outgoingTransition = segment.transitionToNext;

        let opacity = 1;
        const transformParts: string[] = [];
        const style: React.CSSProperties = {};

        if (incomingTransition) {
          const inProgress = interpolate(localFrame, [0, transitionFrames], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp"
          });
          opacity = applyTransitionStyles({
            transition: incomingTransition,
            progress: inProgress,
            direction: "in",
            opacity,
            transformParts,
            style
          });
        }

        if (outgoingTransition) {
          const outProgress = interpolate(
            localFrame,
            [clipFrames - transitionFrames, clipFrames],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          opacity = applyTransitionStyles({
            transition: outgoingTransition,
            progress: outProgress,
            direction: "out",
            opacity,
            transformParts,
            style
          });
        }

        if (transformParts.length > 0) {
          style.transform = transformParts.join(" ");
        }
        style.opacity = Math.max(0, Math.min(1, opacity));

        return (
          <Sequence
            key={`${segment.clipId}-${index}`}
            from={startFrame}
            durationInFrames={clipFrames}
          >
            <AbsoluteFill style={style}>
              <Video src={segment.src} />
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
