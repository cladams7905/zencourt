import { LISTING_CONTENT_SUBCATEGORIES } from "@shared/types/models";
import type { ListingContentSubcategory } from "@shared/types/models";
import type { TemplateRenderCaptionItemInput } from "@web/src/lib/domain/media/templateRender/types";

/**
 * Caption item with optional cache key identity for reading/updating the unified listing content cache.
 */
export type TemplateRenderCaptionItemWithCacheKey = TemplateRenderCaptionItemInput & {
  cacheKeyTimestamp?: number;
  cacheKeyId?: number;
};

/**
 * Parses and validates a listing subcategory from request body.
 * @throws Error when value is missing or not a valid subcategory
 */
export function parseListingSubcategory(value: unknown): ListingContentSubcategory {
  if (typeof value !== "string") {
    throw new Error("A valid listing subcategory is required");
  }
  const normalized = value.trim();
  if (!(LISTING_CONTENT_SUBCATEGORIES as readonly string[]).includes(normalized)) {
    throw new Error("A valid listing subcategory is required");
  }
  return normalized as ListingContentSubcategory;
}

/**
 * Sanitizes raw caption items from request body. Includes cacheKeyTimestamp and cacheKeyId when present.
 * Invalid or empty items are dropped; returns empty array for non-array input.
 */
export function sanitizeCaptionItems(
  input: unknown
): TemplateRenderCaptionItemWithCacheKey[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const candidate = item as {
        id?: string;
        hook?: string | null;
        caption?: string | null;
        broll_query?: string | null;
        cta?: string | null;
        body?: Array<{ header?: string; content?: string }>;
        cacheKeyTimestamp?: number;
        cacheKeyId?: number;
      };
      const id = candidate.id?.trim();
      if (!id) {
        return null;
      }

      const body = (candidate.body ?? [])
        .map((slide) => ({
          header: slide.header?.trim() ?? "",
          content: slide.content?.trim() ?? ""
        }))
        .filter((slide) => slide.header || slide.content);

      const sanitized: TemplateRenderCaptionItemWithCacheKey = {
        id,
        hook: candidate.hook?.trim() || null,
        caption: candidate.caption?.trim() || null,
        broll_query: candidate.broll_query?.trim() || null,
        cta: candidate.cta?.trim() || null,
        body
      };
      if (typeof candidate.cacheKeyTimestamp === "number" && typeof candidate.cacheKeyId === "number") {
        sanitized.cacheKeyTimestamp = candidate.cacheKeyTimestamp;
        sanitized.cacheKeyId = candidate.cacheKeyId;
      }

      if (
        !sanitized.hook &&
        !sanitized.caption &&
        sanitized.body.length === 0
      ) {
        return null;
      }

      return sanitized;
    })
    .filter((item): item is TemplateRenderCaptionItemWithCacheKey => Boolean(item));
}
