import type { PreviewTextOverlay } from "../types/video";

export const PREVIEW_TEXT_OVERLAY_VARIANTS: Array<
  Pick<PreviewTextOverlay, "position" | "background" | "font">
> = [
  { position: "bottom-third", background: "brown", font: "serif-classic" },
  { position: "bottom-third", background: "black", font: "serif-elegant" },
  { position: "top-third", background: "none", font: "sans-modern" },
  { position: "top-third", background: "brown", font: "serif-elegant" },
  { position: "bottom-third", background: "none", font: "serif-classic" }
];

export function hashTextOverlaySeed(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function pickPreviewTextOverlayVariant(
  seed: string
): Pick<PreviewTextOverlay, "position" | "background" | "font"> {
  const index = hashTextOverlaySeed(seed) % PREVIEW_TEXT_OVERLAY_VARIANTS.length;
  return PREVIEW_TEXT_OVERLAY_VARIANTS[index]!;
}

export const PREVIEW_TEXT_OVERLAY_FONT_FAMILY: Record<
  PreviewTextOverlay["font"],
  string
> = {
  "serif-elegant": '"Cormorant Garamond", "Times New Roman", serif',
  "serif-classic": 'Georgia, "Times New Roman", serif',
  "sans-modern": '"Helvetica Neue", Helvetica, Arial, sans-serif'
};

export const PREVIEW_TEXT_OVERLAY_POSITION_TOP: Record<
  PreviewTextOverlay["position"],
  string
> = {
  "top-third": "17%",
  "bottom-third": "64%"
};

export const PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR: Record<
  PreviewTextOverlay["background"],
  string
> = {
  brown: "rgba(118, 95, 76, 0.8)",
  black: "rgba(0, 0, 0, 0.68)",
  none: "transparent"
};

export const PREVIEW_TEXT_OVERLAY_TEXT_COLOR = "#f5f3ef";
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
    fontSizePx: 54
  }
} as const;

/** Convert a video-composition pixel value to a container-query-relative unit. */
export function overlayPxToCqw(px: number): string {
  return `${((px / PREVIEW_COMPOSITION_WIDTH) * 100).toFixed(3)}cqw`;
}
