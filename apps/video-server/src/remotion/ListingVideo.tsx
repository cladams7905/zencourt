import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useVideoConfig,
  Video
} from "remotion";
import type { PreviewTextOverlay } from "@shared/types/video";
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
                <div
                  style={{
                    position: "absolute",
                    top: PREVIEW_TEXT_OVERLAY_POSITION_TOP[clip.textOverlay.position],
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
                      borderRadius:
                        clip.textOverlay.background === "none"
                          ? 0
                          : PREVIEW_TEXT_OVERLAY_BORDER_RADIUS,
                      backgroundColor:
                        PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR[
                          clip.textOverlay.background
                        ],
                      padding:
                        clip.textOverlay.background === "none"
                          ? "0"
                          : `${PREVIEW_TEXT_OVERLAY_LAYOUT.video.boxPaddingVerticalPx}px ${PREVIEW_TEXT_OVERLAY_LAYOUT.video.boxPaddingHorizontalPx}px`,
                      color: PREVIEW_TEXT_OVERLAY_TEXT_COLOR,
                      textAlign: "center",
                      fontFamily:
                        PREVIEW_TEXT_OVERLAY_FONT_FAMILY[clip.textOverlay.font],
                      fontSize: PREVIEW_TEXT_OVERLAY_LAYOUT.video.fontSizePx,
                      lineHeight: PREVIEW_TEXT_OVERLAY_LINE_HEIGHT,
                      letterSpacing: PREVIEW_TEXT_OVERLAY_LETTER_SPACING,
                      textShadow:
                        clip.textOverlay.background === "none"
                          ? PREVIEW_TEXT_OVERLAY_NO_BACKGROUND_TEXT_SHADOW
                          : "none"
                    }}
                  >
                    {clip.textOverlay.text}
                  </div>
                </div>
              ) : null}
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
