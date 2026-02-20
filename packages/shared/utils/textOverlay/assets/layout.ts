import type { PreviewTextOverlay } from "../../../types/video";

export const PREVIEW_TEXT_OVERLAY_POSITION_TOP: Record<
  PreviewTextOverlay["position"],
  string
> = {
  "top-third": "17%",
  center: "50%",
  "bottom-third": "64%"
};

export const PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR: Record<
  PreviewTextOverlay["background"],
  string
> = {
  black: "rgba(0, 0, 0, 0.9)",
  brown: "rgba(118, 95, 76, 0.9)",
  "brown-700": "rgba(85, 62, 47, 0.9)",
  "brown-500": "rgba(118, 95, 76, 0.9)",
  "brown-300": "rgba(166, 142, 124, 0.9)",
  "brown-200": "rgba(201, 184, 170, 0.9)",
  "brown-100": "rgba(229, 220, 211, 0.9)",
  white: "rgba(245, 241, 236, 0.9)",
  none: "transparent"
};

export const PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR_OPAQUE: Record<
  PreviewTextOverlay["background"],
  string
> = {
  black: "rgba(0, 0, 0, 0.95)",
  brown: "rgba(118, 95, 76, 0.95)",
  "brown-700": "rgba(85, 62, 47, 0.95)",
  "brown-500": "rgba(118, 95, 76, 0.95)",
  "brown-300": "rgba(166, 142, 124, 0.95)",
  "brown-200": "rgba(201, 184, 170, 0.95)",
  "brown-100": "rgba(229, 220, 211, 0.95)",
  white: "rgba(245, 241, 236, 0.95)",
  none: "transparent"
};

export const PREVIEW_TEXT_OVERLAY_TEXT_COLOR: Record<
  PreviewTextOverlay["background"],
  string
> = {
  black: "#f5f3ef",
  brown: "#f5f3ef",
  "brown-700": "#f5f3ef",
  "brown-500": "#f5f3ef",
  "brown-300": "#f5f3ef",
  "brown-200": "#16120e",
  "brown-100": "#16120e",
  white: "#16120e",
  none: "#f5f3ef"
};

export const PREVIEW_TEXT_OVERLAY_NO_BACKGROUND_TEXT_SHADOW =
  "0 2px 8px rgba(0, 0, 0, 0.5), 0 0 2px rgba(0, 0, 0, 0.7)";
export const PREVIEW_TEXT_OVERLAY_MAX_WIDTH = "88%";
export const PREVIEW_TEXT_OVERLAY_BORDER_RADIUS = 4;
export const PREVIEW_TEXT_OVERLAY_LINE_HEIGHT = 1.2;
export const PREVIEW_TEXT_OVERLAY_LETTER_SPACING = 0.1;

export const PREVIEW_COMPOSITION_WIDTH = 1080;

export const PREVIEW_TEXT_OVERLAY_LAYOUT = {
  video: {
    horizontalPaddingPx: 70,
    boxPaddingVerticalPx: 18,
    boxPaddingHorizontalPx: 26,
    fontSizePx: 68
  }
} as const;

/** Convert a video-composition pixel value to a container-query-relative unit. */
export function overlayPxToCqw(px: number): string {
  return `${((px / PREVIEW_COMPOSITION_WIDTH) * 100).toFixed(3)}cqw`;
}
