import * as React from "react";
import type { PreviewTextOverlay } from "../../../types/video";
import {
  PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR,
  PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR_OPAQUE,
  PREVIEW_TEXT_OVERLAY_POSITION_TOP,
  PREVIEW_TEXT_OVERLAY_LAYOUT,
  PREVIEW_TEXT_OVERLAY_MAX_WIDTH,
  PREVIEW_TEXT_OVERLAY_BORDER_RADIUS,
  PREVIEW_TEXT_OVERLAY_TEXT_COLOR
} from "../assets/layout";
import { computeOverlayLineStyles } from "../renderer";
import { pickSandwichOverlayArrowPath } from "../assets/arrows";

export interface PreviewTextOverlayRendererProps {
  overlay: PreviewTextOverlay;
  topOverride?: string;
  baseFontSizePxOverride?: number;
}

/**
 * Renders a PreviewTextOverlay for video compositions (Remotion).
 * Used by both web preview (ListingTimelinePreviewComposition) and
 * video-server (ListingVideo) to ensure identical output.
 */
export function PreviewTextOverlayRenderer({
  overlay,
  topOverride,
  baseFontSizePxOverride
}: PreviewTextOverlayRendererProps): React.ReactElement {
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
        {lineStyles.map((line) => (
          <div
            key={line.text}
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
