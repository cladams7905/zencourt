export type PreviewTextOverlayPosition = "top-third" | "bottom-third";
export type PreviewTextOverlayBackground = "brown" | "black" | "none";
export type PreviewTextOverlayFont =
  | "serif-elegant"
  | "serif-classic"
  | "sans-modern";

export interface PreviewTextOverlay {
  text: string;
  position: PreviewTextOverlayPosition;
  background: PreviewTextOverlayBackground;
  font: PreviewTextOverlayFont;
}
