import type { PlaceDetailsResponse } from "../transport/client";
import {
  COMMUNITY_AUDIENCE_DELTA_TTL_SECONDS,
  PLACE_DETAILS_CACHE_TTL_SECONDS,
  getCommunityAudienceCacheKey,
  getCommunityCacheTtlSeconds,
  getPlaceDetailsCacheKey,
  getPlacePoolCacheKey
} from "./keys";
import type {
  AudienceDelta,
  CachedPlacePool,
  CachedPlacePoolItem
} from "./types";

type RedisClientLike = {
  get: <T>(key: string) => Promise<T | null>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set: (...args: any[]) => Promise<unknown>;
};

type PlaceCacheDeps = {
  getRedisClient: () => RedisClientLike | null;
  logger: {
    warn: (context: unknown, message?: string) => void;
  };
  now: () => Date;
};

export function createPlaceCacheOps({
  getRedisClient,
  logger,
  now
}: PlaceCacheDeps) {
  return {
    async getCachedPlaceDetails(
      placeId: string
    ): Promise<PlaceDetailsResponse | null> {
      const redis = getRedisClient();
      if (!redis) return null;
      try {
        const cached = await redis.get<PlaceDetailsResponse>(
          getPlaceDetailsCacheKey(placeId)
        );
        return cached ?? null;
      } catch (error) {
        logger.warn(
          {
            placeId,
            error: error instanceof Error ? error.message : String(error)
          },
          "Failed to read place details from cache"
        );
        return null;
      }
    },

    async setCachedPlaceDetails(
      placeId: string,
      payload: PlaceDetailsResponse
    ): Promise<void> {
      const redis = getRedisClient();
      if (!redis) return;
      try {
        await redis.set(getPlaceDetailsCacheKey(placeId), payload, {
          ex: PLACE_DETAILS_CACHE_TTL_SECONDS
        });
      } catch (error) {
        logger.warn(
          {
            placeId,
            error: error instanceof Error ? error.message : String(error)
          },
          "Failed to write place details to cache"
        );
      }
    },

    async getCachedAudienceDelta(
      zipCode: string,
      audienceSegment: string,
      serviceAreas?: string[] | null,
      city?: string | null,
      state?: string | null
    ): Promise<AudienceDelta | null> {
      const redis = getRedisClient();
      if (!redis) return null;
      try {
        const cached = await redis.get<AudienceDelta>(
          getCommunityAudienceCacheKey(
            zipCode,
            audienceSegment,
            serviceAreas,
            city,
            state
          )
        );
        return cached ?? null;
      } catch (error) {
        logger.warn(
          {
            zipCode,
            audienceSegment,
            error: error instanceof Error ? error.message : String(error)
          },
          "Failed to read community audience delta from cache"
        );
        return null;
      }
    },

    async setCachedAudienceDelta(
      zipCode: string,
      audienceSegment: string,
      payload: AudienceDelta,
      serviceAreas?: string[] | null,
      city?: string | null,
      state?: string | null
    ): Promise<void> {
      const redis = getRedisClient();
      if (!redis) return;
      try {
        await redis.set(
          getCommunityAudienceCacheKey(
            zipCode,
            audienceSegment,
            serviceAreas,
            city,
            state
          ),
          payload,
          { ex: COMMUNITY_AUDIENCE_DELTA_TTL_SECONDS }
        );
      } catch (error) {
        logger.warn(
          {
            zipCode,
            audienceSegment,
            error: error instanceof Error ? error.message : String(error)
          },
          "Failed to write community audience delta to cache"
        );
      }
    },

    async getCachedPlacePool(
      zipCode: string,
      category: string,
      audience?: string | null,
      serviceAreas?: string[] | null,
      city?: string | null,
      state?: string | null
    ): Promise<CachedPlacePool | null> {
      const redis = getRedisClient();
      if (!redis) return null;
      try {
        const cached = await redis.get<CachedPlacePool>(
          getPlacePoolCacheKey(
            zipCode,
            category,
            audience,
            serviceAreas,
            city,
            state
          )
        );
        return cached ?? null;
      } catch (error) {
        logger.warn(
          {
            zipCode,
            category,
            audience,
            error: error instanceof Error ? error.message : String(error)
          },
          "Failed to read place pool from cache"
        );
        return null;
      }
    },

    async setCachedPlacePool(
      zipCode: string,
      category: string,
      items: CachedPlacePoolItem[],
      audience?: string | null,
      serviceAreas?: string[] | null,
      city?: string | null,
      state?: string | null
    ): Promise<void> {
      const redis = getRedisClient();
      if (!redis) return;
      const payload: CachedPlacePool = {
        items,
        fetchedAt: now().toISOString(),
        queryCount: items.length
      };
      try {
        await redis.set(
          getPlacePoolCacheKey(
            zipCode,
            category,
            audience,
            serviceAreas,
            city,
            state
          ),
          payload,
          { ex: getCommunityCacheTtlSeconds() }
        );
      } catch (error) {
        logger.warn(
          {
            zipCode,
            category,
            audience,
            poolSize: items.length,
            error: error instanceof Error ? error.message : String(error)
          },
          "Failed to write place pool to cache"
        );
      }
    }
  };
}
