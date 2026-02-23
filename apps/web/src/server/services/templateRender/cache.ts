import { createHash } from "node:crypto";
import { getSharedRedisClient } from "@web/src/lib/cache/redisClient";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import type { ListingContentSubcategory } from "@shared/types/models";
import type { ListingTemplateRenderedItem } from "@web/src/lib/domain/media/templateRender/types";

const logger = createChildLogger(baseLogger, {
  module: "template-render-cache"
});

export const TEMPLATE_RENDER_CACHE_PREFIX = "listing-template-render";
export const TEMPLATE_RENDER_CACHE_TTL_SECONDS = 60 * 60 * 12;

export type CachedTemplateRender = {
  imageUrl: string;
  templateId: string;
  captionItemId: string;
  modifications: Record<string, string>;
};

function modificationsHash(modifications: Record<string, string>): string {
  const sorted = Object.keys(modifications)
    .sort()
    .map((k) => `${k}=${(modifications as Record<string, string>)[k] ?? ""}`)
    .join("&");
  return createHash("sha1").update(sorted).digest("hex").slice(0, 16);
}

export function buildTemplateRenderCacheKey(params: {
  listingId: string;
  subcategory: ListingContentSubcategory;
  captionItemId: string;
  templateId: string;
  modifications: Record<string, string>;
}): string {
  const hash = modificationsHash(params.modifications);
  return [
    TEMPLATE_RENDER_CACHE_PREFIX,
    params.listingId,
    params.subcategory,
    params.captionItemId,
    params.templateId,
    hash
  ].join(":");
}

/**
 * Returns cached template render if present; otherwise null.
 */
export async function getCachedTemplateRender(
  cacheKey: string
): Promise<CachedTemplateRender | null> {
  const redis = getSharedRedisClient();
  if (!redis) return null;
  try {
    const cached = await redis.get<CachedTemplateRender>(cacheKey);
    if (cached && typeof cached.imageUrl === "string") {
      return cached;
    }
  } catch (error) {
    logger.warn({ error, cacheKey }, "Failed reading template render cache");
  }
  return null;
}

/**
 * Writes a single template render to Redis. No-op if Redis is unavailable.
 */
export async function setCachedTemplateRender(
  cacheKey: string,
  value: CachedTemplateRender
): Promise<void> {
  const redis = getSharedRedisClient();
  if (!redis) return;
  try {
    await redis.set(cacheKey, value, {
      ex: TEMPLATE_RENDER_CACHE_TTL_SECONDS
    });
  } catch (error) {
    logger.warn({ error, cacheKey }, "Failed writing template render cache");
  }
}

/**
 * Builds a ListingTemplateRenderedItem from a cached value (for SSE/response).
 */
export function cachedToRenderedItem(
  cached: CachedTemplateRender
): ListingTemplateRenderedItem {
  return {
    templateId: cached.templateId,
    imageUrl: cached.imageUrl,
    captionItemId: cached.captionItemId,
    parametersUsed: {}
  };
}
