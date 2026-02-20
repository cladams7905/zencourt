import type { OverlayFontPairing, PreviewTextOverlay } from "../../../types/video";
import { RICH_OVERLAY_FONT_PAIRINGS } from "./fonts";

export interface OverlayVariant {
  position: PreviewTextOverlay["position"];
  background: PreviewTextOverlay["background"];
  font: PreviewTextOverlay["font"];
  fontPairing: OverlayFontPairing;
}

// Weighted pool: darker backgrounds appear more often than light backgrounds.
export const PREVIEW_TEXT_OVERLAY_VARIANTS: OverlayVariant[] = [
  {
    position: "bottom-third",
    background: "brown-700",
    font: "serif-classic",
    fontPairing: "elegant-script"
  },
  {
    position: "bottom-third",
    background: "black",
    font: "serif-elegant",
    fontPairing: "modern-script"
  },
  {
    position: "top-third",
    background: "brown-700",
    font: "serif-elegant",
    fontPairing: "script-forward"
  },
  {
    position: "bottom-third",
    background: "brown-500",
    font: "serif-classic",
    fontPairing: "elegant-script"
  },
  {
    position: "center",
    background: "black",
    font: "serif-classic",
    fontPairing: "modern-script"
  },
  {
    position: "top-third",
    background: "brown-700",
    font: "serif-elegant",
    fontPairing: "elegant-script"
  },
  {
    position: "bottom-third",
    background: "brown-500",
    font: "sans-modern",
    fontPairing: "classic-clean"
  },
  {
    position: "center",
    background: "brown-700",
    font: "serif-classic",
    fontPairing: "script-forward"
  },
  // Lighter options are intentionally fewer.
  {
    position: "top-third",
    background: "brown-300",
    font: "sans-modern",
    fontPairing: "classic-clean"
  },
  {
    position: "center",
    background: "brown-200",
    font: "serif-elegant",
    fontPairing: "classic-clean"
  },
  {
    position: "bottom-third",
    background: "brown-100",
    font: "sans-modern",
    fontPairing: "modern-script"
  },
  {
    position: "center",
    background: "white",
    font: "serif-classic",
    fontPairing: "elegant-script"
  }
];

export function hashTextOverlaySeed(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function pickPreviewTextOverlayVariant(seed: string): OverlayVariant {
  const index =
    hashTextOverlaySeed(seed) % PREVIEW_TEXT_OVERLAY_VARIANTS.length;
  return PREVIEW_TEXT_OVERLAY_VARIANTS[index]!;
}

const RICH_OVERLAY_POSITION_OPTIONS: PreviewTextOverlay["position"][] = [
  "top-third",
  "center",
  "bottom-third"
];

export function pickRichOverlayPosition(
  seed: string
): PreviewTextOverlay["position"] {
  const index = hashTextOverlaySeed(`${seed}:position`) % 3;
  return RICH_OVERLAY_POSITION_OPTIONS[index] ?? "center";
}

export function pickRichOverlayFontPairing(seed: string): OverlayFontPairing {
  const index =
    hashTextOverlaySeed(`${seed}:font-pairing`) %
    RICH_OVERLAY_FONT_PAIRINGS.length;
  return RICH_OVERLAY_FONT_PAIRINGS[index] ?? "block-rouge-italiana";
}

export function pickRichOverlayFontPairingForVariation(
  variationNumber: number
): OverlayFontPairing {
  const normalizedVariation = Math.max(1, Math.floor(variationNumber));
  const index = (normalizedVariation - 1) % RICH_OVERLAY_FONT_PAIRINGS.length;
  return RICH_OVERLAY_FONT_PAIRINGS[index] ?? "block-rouge-italiana";
}
