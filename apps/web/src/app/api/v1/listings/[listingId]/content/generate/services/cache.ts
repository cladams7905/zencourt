import { getSharedRedisClient } from "@web/src/lib/cache/redisClient";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import { LISTING_CONTENT_CACHE_TTL_SECONDS } from "@web/src/lib/domain/listing";
import type { ListingGeneratedItem } from "./types";

const logger = createChildLogger(baseLogger, {
  module: "listing-content-generate-cache"
});

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
    if (
      cached &&
      Array.isArray(cached) &&
      cached.length > 0
    ) {
      return cached;
    }
  } catch (error) {
    logger.warn(
      { error, cacheKey },
      "Failed reading listing content cache"
    );
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
    logger.warn(
      { error, cacheKey },
      "Failed writing listing content cache"
    );
  }
}
