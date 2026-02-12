import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useVideoConfig,
  Video
} from "remotion";
import { loadFont as loadCormorant } from "@remotion/google-fonts/CormorantGaramond";
import { loadFont as loadRougeScript } from "@remotion/google-fonts/RougeScript";
import type { PreviewTextOverlay } from "@shared/types/video";
import {
  PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR,
  PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR_OPAQUE,
  PREVIEW_TEXT_OVERLAY_POSITION_TOP,
  PREVIEW_TEXT_OVERLAY_LAYOUT,
  PREVIEW_TEXT_OVERLAY_MAX_WIDTH,
  PREVIEW_TEXT_OVERLAY_BORDER_RADIUS,
  PREVIEW_TEXT_OVERLAY_TEXT_COLOR,
  computeOverlayLineStyles
} from "@shared/utils";

loadCormorant();
loadRougeScript();

export type ListingClip = {
  src: string;
  durationSeconds: number;
  textOverlay?: PreviewTextOverlay;
};

export type ListingVideoProps = {
  clips: ListingClip[];
  transitionDurationSeconds: number;
  // orientation is used by calculateMetadata in index.tsx for dimension calculation
  orientation?: "vertical" | "landscape";
};

function TextOverlay({ overlay }: { overlay: PreviewTextOverlay }) {
  const hasBackground = overlay.background !== "none";
  const backgroundColor =
    overlay.templatePattern === "simple"
      ? PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR_OPAQUE[overlay.background]
      : PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR[overlay.background];
  const layout = PREVIEW_TEXT_OVERLAY_LAYOUT.video;
  const lineStyles = computeOverlayLineStyles(overlay, layout.fontSizePx);
  const shouldCenterByPosition = overlay.position === "center";

  return (
    <div
      style={{
        position: "absolute",
        top: PREVIEW_TEXT_OVERLAY_POSITION_TOP[overlay.position],
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
          textAlign: "center" as const
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
            {line.text}
          </div>
        ))}
      </div>
    </div>
  );
}

export const ListingVideo: React.FC<ListingVideoProps> = ({ clips }) => {
  const { fps } = useVideoConfig();

  let cursor = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {clips.map((clip, index) => {
        const clipFrames = Math.max(1, Math.round(clip.durationSeconds * fps));
        const startFrame = cursor;
        cursor += clipFrames;

        return (
          <Sequence
            key={`${clip.src}-${index}`}
            from={startFrame}
            durationInFrames={clipFrames}
          >
            <AbsoluteFill>
              <Video
                src={clip.src}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              {clip.textOverlay ? (
                <TextOverlay overlay={clip.textOverlay} />
              ) : null}
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
