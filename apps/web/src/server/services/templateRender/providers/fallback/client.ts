import type { TemplateRenderCaptionItemInput } from "@web/src/lib/domain/media/templateRender/types";
import type { ListingTemplateRenderedItem } from "@web/src/lib/domain/media/templateRender/types";
import { FALLBACK_TEMPLATE_ID } from "./constants";

export type ListingImageForFallback = {
  url: string;
  isPrimary?: boolean | null;
  primaryScore?: number | null;
  uploadedAt?: Date | null;
};

/**
 * Picks one listing image for a caption item using deterministic order:
 * isPrimary (true first), then primaryScore (desc), then uploadedAt (desc).
 * Returns one ListingTemplateRenderedItem with isFallback: true, or null if no images.
 */
export function buildFallbackRenderedItem(
  captionItem: TemplateRenderCaptionItemInput,
  listingImages: ListingImageForFallback[]
): ListingTemplateRenderedItem | null {
  if (listingImages.length === 0) {
    return null;
  }

  const sorted = [...listingImages].sort((a, b) => {
    const aPrimary = a.isPrimary ? 1 : 0;
    const bPrimary = b.isPrimary ? 1 : 0;
    if (aPrimary !== bPrimary) {
      return bPrimary - aPrimary;
    }
    const aScore = a.primaryScore ?? -Infinity;
    const bScore = b.primaryScore ?? -Infinity;
    if (aScore !== bScore) {
      return bScore - aScore;
    }
    const aMs = a.uploadedAt?.getTime() ?? 0;
    const bMs = b.uploadedAt?.getTime() ?? 0;
    return bMs - aMs;
  });

  const chosen = sorted[0];
  if (!chosen?.url) {
    return null;
  }

  return {
    templateId: FALLBACK_TEMPLATE_ID,
    imageUrl: chosen.url,
    captionItemId: captionItem.id,
    parametersUsed: {},
    isFallback: true
  };
}
