export type PreviewTextOverlayPosition =
  | "top-third"
  | "center"
  | "bottom-third";
export type PreviewTextOverlayBackground =
  | "black"
  | "brown"
  | "brown-700"
  | "brown-500"
  | "brown-300"
  | "brown-200"
  | "brown-100"
  | "white"
  | "none";
export type PreviewTextOverlayFont =
  | "serif-elegant"
  | "serif-classic"
  | "sans-modern";

export type OverlayFontRole = "headline" | "accent" | "body";

export type OverlayTemplatePattern =
  | "simple"
  | "sandwich"
  | "accent-headline";

export type OverlayFontPairing =
  | "elegant-script"
  | "modern-script"
  | "classic-clean"
  | "script-forward"
  | "block-rouge-italiana"
  | "block-league-dm"
  | "block-rouge-onest"
  | "serif-dm-gwendolyn"
  | "serif-italiana-rouge";

export interface OverlayLine {
  text: string;
  fontRole: OverlayFontRole;
}

export interface PreviewTextOverlay {
  text: string;
  position: PreviewTextOverlayPosition;
  background: PreviewTextOverlayBackground;
  font: PreviewTextOverlayFont;
  templatePattern?: OverlayTemplatePattern;
  lines?: OverlayLine[];
  fontPairing?: OverlayFontPairing;
}
