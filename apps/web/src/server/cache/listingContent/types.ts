export type ListingMediaType = "video" | "image";

export type ListingGeneratedItem = {
  hook: string;
  broll_query: string;
  body: null | Array<{
    header: string;
    content: string;
    broll_query: string;
  }>;
  cta: string | null;
  caption: string;
};

/**
 * One cache entry per item: content plus optional template render.
 * Used for listing-content:{userId}:{listingId}:{subcategory}:{mediaType}:{timestamp}:{id}.
 */
export type ListingContentItem = ListingGeneratedItem & {
  renderedImageUrl: string | null;
  renderedTemplateId?: string;
  renderedModifications?: Record<string, string>;
};

export type ListingContentItemWithKey = ListingContentItem & {
  cacheKeyTimestamp: number;
  cacheKeyId: number;
};
