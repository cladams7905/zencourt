import type { PreviewTextOverlay } from "@web/src/lib/video/previewTimeline";
import type { OverlayTemplatePattern } from "@shared/types/video";
import {
  buildOverlayTemplateLines,
  pickPreviewTextOverlayVariant,
  pickRichOverlayFontPairing,
  pickRichOverlayFontPairingForVariation,
  pickRichOverlayPosition
} from "@shared/utils";
import type {
  ListingImagePreviewItem,
  ListingImagePreviewSlide
} from "@web/src/components/listings/create/shared/types";

export function resolveItemTemplatePattern(
  item: ListingImagePreviewItem
): Exclude<OverlayTemplatePattern, "simple"> {
  const slides = item.slides ?? [];
  if (slides.length === 0) {
    return "sandwich";
  }

  const withBothAccents = slides.find(
    (slide) =>
      Boolean(slide.textOverlay?.accent_top?.trim()) &&
      Boolean(slide.textOverlay?.accent_bottom?.trim())
  );
  if (withBothAccents) {
    return "sandwich";
  }

  return "accent-headline";
}

export function buildImagePreviewOverlay(
  itemId: string,
  slide: ListingImagePreviewSlide,
  variationNumber: number,
  patternOverride?: Exclude<OverlayTemplatePattern, "simple">
): PreviewTextOverlay | null {
  const plainText = slide.header?.trim();
  if (!plainText && !slide.textOverlay?.headline?.trim()) {
    return null;
  }

  const variationSeed = `${itemId}:${variationNumber}`;
  const variant = pickPreviewTextOverlayVariant(`${variationSeed}:base`);
  const { pattern, lines } = buildOverlayTemplateLines(
    slide.textOverlay,
    plainText || slide.textOverlay?.headline || "",
    patternOverride
  );
  const hasSubheaders = Boolean(
    slide.textOverlay?.accent_top?.trim() ||
      slide.textOverlay?.accent_bottom?.trim()
  );

  return {
    text: plainText || slide.textOverlay?.headline || "",
    position:
      pattern === "simple"
        ? variant.position
        : pickRichOverlayPosition(variationSeed),
    background: pattern === "simple" ? variant.background : "none",
    font: variant.font,
    templatePattern: pattern,
    lines,
    fontPairing:
      pattern === "simple"
        ? variant.fontPairing
        : hasSubheaders
          ? pickRichOverlayFontPairingForVariation(variationNumber)
          : pickRichOverlayFontPairing(
              `${variationSeed}:${plainText || "headline"}`
            )
  };
}
