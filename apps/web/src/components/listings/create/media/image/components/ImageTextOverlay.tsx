import * as React from "react";
import type { PreviewTextOverlay } from "@shared/types/video";
import {
  computeOverlayLineStyles,
  overlayPxToCqw,
  parseInlineItalicSegments,
  pickSandwichOverlayArrowPath,
  PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR,
  PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR_OPAQUE,
  PREVIEW_TEXT_OVERLAY_BORDER_RADIUS,
  PREVIEW_TEXT_OVERLAY_MAX_WIDTH,
  PREVIEW_TEXT_OVERLAY_POSITION_TOP,
  PREVIEW_TEXT_OVERLAY_TEXT_COLOR
} from "@shared/utils";
import { LoadingImage } from "@web/src/components/ui/loading-image";
import {
  IMAGE_OVERLAY_BASE_FONT_SIZE_PX,
  IMAGE_OVERLAY_BOX_PADDING_HORIZONTAL_PX,
  IMAGE_OVERLAY_BOX_PADDING_VERTICAL_PX,
  IMAGE_OVERLAY_HORIZONTAL_PADDING_PX
} from "@web/src/components/listings/create/media/image/imagePreviewConstants";

export function ImageTextOverlay({ overlay }: { overlay: PreviewTextOverlay }) {
  const hasBackground = overlay.background !== "none";
  const backgroundColor =
    overlay.templatePattern === "simple"
      ? PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR_OPAQUE[overlay.background]
      : PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR[overlay.background];
  const lineStyles = computeOverlayLineStyles(
    overlay,
    IMAGE_OVERLAY_BASE_FONT_SIZE_PX
  );
  const arrowPath = pickSandwichOverlayArrowPath(overlay);

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ containerType: "inline-size" }}
    >
      <div
        className="absolute left-0 right-0 flex justify-center px-4"
        style={{
          top: PREVIEW_TEXT_OVERLAY_POSITION_TOP[overlay.position],
          paddingLeft: overlayPxToCqw(IMAGE_OVERLAY_HORIZONTAL_PADDING_PX),
          paddingRight: overlayPxToCqw(IMAGE_OVERLAY_HORIZONTAL_PADDING_PX),
          transform:
            overlay.position === "center" ? "translateY(-50%)" : undefined
        }}
      >
        <div
          style={{
            maxWidth: PREVIEW_TEXT_OVERLAY_MAX_WIDTH,
            borderRadius: overlayPxToCqw(PREVIEW_TEXT_OVERLAY_BORDER_RADIUS),
            backgroundColor,
            padding: hasBackground
              ? `${overlayPxToCqw(IMAGE_OVERLAY_BOX_PADDING_VERTICAL_PX)} ${overlayPxToCqw(IMAGE_OVERLAY_BOX_PADDING_HORIZONTAL_PX)}`
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
              {parseInlineItalicSegments(line.text).map((segment, segmentIndex) => (
                <span
                  key={segmentIndex}
                  style={segment.italic ? { fontStyle: "italic" } : undefined}
                >
                  {segment.text}
                </span>
              ))}
            </div>
          ))}
          {arrowPath ? (
            <LoadingImage
              src={arrowPath}
              alt=""
              aria-hidden
              width={80}
              height={20}
              style={{
                display: "block",
                margin: `-${overlayPxToCqw(30)} auto 0`,
                maxWidth: "100%",
                opacity: 0.95,
                filter: "invert(1) drop-shadow(0 2px 6px rgba(0, 0, 0, 0.45))"
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
