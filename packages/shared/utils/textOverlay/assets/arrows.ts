import type { PreviewTextOverlay } from "../../../types/video";
import { hashTextOverlaySeed } from "./variants";

export const PREVIEW_TEXT_OVERLAY_ARROW_PATHS = [
  "/overlays/arrows/noun-arrow-2581915.svg",
  "/overlays/arrows/noun-arrow-3004573.svg",
  "/overlays/arrows/noun-arrow-3309229.svg",
  "/overlays/arrows/noun-arrow-3309237.svg",
  "/overlays/arrows/noun-arrow-up-1155837.svg",
  "/overlays/arrows/noun-dip-right-3905878.svg",
  "/overlays/arrows/noun-doodle-arrow-1937655.svg",
  "/overlays/arrows/noun-drawn-arrow-right-3464695.svg",
  "/overlays/arrows/noun-drawn-arrow-right-3464709.svg",
  "/overlays/arrows/noun-hand-drawn-arrow-2440595.svg",
  "/overlays/arrows/noun-hand-drawn-arrow-2440669.svg",
  "/overlays/arrows/noun-hand-drawn-arrow-2440680.svg",
  "/overlays/arrows/noun-heart-arrow-845384.svg",
  "/overlays/arrows/noun-right-2380236.svg",
  "/overlays/arrows/noun-right-arrow-786362.svg",
  "/overlays/arrows/noun-right-arrow-786589.svg",
  "/overlays/arrows/noun-right-arrow-787175.svg",
  "/overlays/arrows/noun-right-arrows-786531.svg"
] as const;

function buildOverlayArrowSeed(overlay: PreviewTextOverlay): string {
  const lineSeed =
    overlay.lines?.map((line) => `${line.fontRole}:${line.text}`).join("|") ??
    "";
  return `${overlay.templatePattern ?? "simple"}:${overlay.text}:${lineSeed}`;
}

/**
 * For sandwich templates, returns either a random arrow path or null.
 * Probability is 50/50 between "has arrow" and "no arrow".
 */
export function pickSandwichOverlayArrowPath(
  overlay: PreviewTextOverlay
): string | null {
  if (overlay.templatePattern !== "sandwich") {
    return null;
  }

  const seed = buildOverlayArrowSeed(overlay);
  const shouldShowArrow = hashTextOverlaySeed(`${seed}:show-arrow`) % 2 === 0;
  if (!shouldShowArrow) {
    return null;
  }

  const index =
    hashTextOverlaySeed(`${seed}:arrow-index`) %
    PREVIEW_TEXT_OVERLAY_ARROW_PATHS.length;
  return PREVIEW_TEXT_OVERLAY_ARROW_PATHS[index] ?? null;
}
