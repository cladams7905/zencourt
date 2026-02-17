import * as React from "react";
import type { PreviewTextOverlay } from "@web/src/lib/video/previewTimeline";
import {
  computeOverlayLineStyles,
  overlayPxToCqw,
  pickSandwichOverlayArrowPath,
  PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR,
  PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR_OPAQUE,
  PREVIEW_TEXT_OVERLAY_BORDER_RADIUS,
  PREVIEW_TEXT_OVERLAY_LAYOUT,
  PREVIEW_TEXT_OVERLAY_MAX_WIDTH,
  PREVIEW_TEXT_OVERLAY_POSITION_TOP,
  PREVIEW_TEXT_OVERLAY_TEXT_COLOR
} from "@shared/utils";
import { LoadingImage } from "@web/src/components/ui/loading-image";

export function VideoThumbnailTextOverlay({
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
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        containerType: "inline-size"
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%"
        }}
      >
        <div
          style={{
            position: "absolute",
            top: overlayTop,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            paddingLeft: overlayPxToCqw(layout.horizontalPaddingPx),
            paddingRight: overlayPxToCqw(layout.horizontalPaddingPx),
            transform: shouldCenterByPosition ? "translateY(-50%)" : undefined
          }}
        >
          <div
            style={{
              maxWidth: PREVIEW_TEXT_OVERLAY_MAX_WIDTH,
              borderRadius: PREVIEW_TEXT_OVERLAY_BORDER_RADIUS,
              backgroundColor,
              padding: hasBackground
                ? `${overlayPxToCqw(layout.boxPaddingVerticalPx)} ${overlayPxToCqw(layout.boxPaddingHorizontalPx)}`
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
                  fontSize: overlayPxToCqw(line.fontSize),
                  textTransform: line.textTransform,
                  fontStyle: line.fontStyle,
                  lineHeight: overlayPxToCqw(line.fontSize * line.lineHeight),
                  letterSpacing:
                    typeof line.letterSpacing === "number"
                      ? overlayPxToCqw(line.letterSpacing)
                      : line.letterSpacing,
                  textShadow: line.textShadow,
                  marginTop:
                    typeof line.marginTop === "number"
                      ? overlayPxToCqw(line.marginTop)
                      : line.marginTop,
                  marginBottom:
                    typeof line.marginBottom === "number"
                      ? overlayPxToCqw(line.marginBottom)
                      : line.marginBottom
                }}
              >
                {line.text}
              </div>
            ))}
            {arrowPath ? (
              <LoadingImage
                src={arrowPath}
                alt=""
                width={220}
                height={40}
                aria-hidden
                style={{
                  display: "block",
                  margin: `${overlayPxToCqw(3)} auto 0`,
                  width: overlayPxToCqw(220),
                  maxWidth: "100%",
                  opacity: 0.95,
                  filter: "invert(1) drop-shadow(0 2px 6px rgba(0, 0, 0, 0.45))"
                }}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
