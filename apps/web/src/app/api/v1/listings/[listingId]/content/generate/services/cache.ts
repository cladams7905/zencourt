import { createHash } from "node:crypto";
import { getSharedRedisClient } from "@web/src/lib/cache/redisClient";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import type { ListingContentSubcategory } from "@shared/types/models";
import type { ListingGeneratedItem, ListingMediaType } from "./types";

const logger = createChildLogger(baseLogger, {
  module: "listing-content-generate-cache"
});

export const LISTING_CONTENT_CACHE_PREFIX = "listing-content";
export const LISTING_CONTENT_CACHE_TTL_SECONDS = 60 * 60 * 12;

export function buildListingContentCacheKey(params: {
  userId: string;
  listingId: string;
  subcategory: ListingContentSubcategory;
  mediaType: ListingMediaType;
  focus: string;
  notes: string;
  generation_nonce: string;
  propertyFingerprint: string;
}): string {
  const focusHash = createHash("sha1")
    .update(`${params.focus}::${params.notes}::${params.generation_nonce}`)
    .digest("hex")
    .slice(0, 10);
  return [
    LISTING_CONTENT_CACHE_PREFIX,
    params.userId,
    params.listingId,
    params.subcategory,
    params.mediaType,
    params.propertyFingerprint,
    focusHash
  ].join(":");
}

/**
 * Returns cached listing content items if present and non-empty; otherwise null.
 */
export async function getCachedListingContent(
  cacheKey: string
): Promise<ListingGeneratedItem[] | null> {
  const redis = getSharedRedisClient();
  if (!redis) return null;
  try {
    const cached = await redis.get<ListingGeneratedItem[]>(cacheKey);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached;
    }
  } catch (error) {
    logger.warn({ error, cacheKey }, "Failed reading listing content cache");
  }
  return null;
}

/**
 * Writes listing content items to Redis. No-op if Redis is unavailable; logs on failure.
 */
export async function setCachedListingContent(
  cacheKey: string,
  items: ListingGeneratedItem[]
): Promise<void> {
  const redis = getSharedRedisClient();
  if (!redis) return;
  try {
    await redis.set(cacheKey, items, {
      ex: LISTING_CONTENT_CACHE_TTL_SECONDS
    });
  } catch (error) {
    logger.warn({ error, cacheKey }, "Failed writing listing content cache");
  }
}
