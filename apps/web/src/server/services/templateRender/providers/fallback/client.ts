import type { TemplateRenderCaptionItemInput } from "@web/src/lib/domain/media/templateRender/types";
import type { ListingTemplateRenderedItem } from "@web/src/lib/domain/media/templateRender/types";
import { FALLBACK_TEMPLATE_ID } from "./constants";

export type ListingImageForFallback = {
  url: string;
  recommendationScore?: number | null;
  shotType?: string | null;
  uploadedAt?: Date | null;
};

/**
 * Picks one listing image for a caption item using deterministic order:
 * room shots first, then recommendationScore (desc), then uploadedAt (desc).
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
    const aRoom = a.shotType === "detail" ? 0 : 1;
    const bRoom = b.shotType === "detail" ? 0 : 1;
    if (aRoom !== bRoom) {
      return bRoom - aRoom;
    }
    const aScore = a.recommendationScore ?? -Infinity;
    const bScore = b.recommendationScore ?? -Infinity;
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
