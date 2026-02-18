import type { CommunityData } from "@web/src/types/market";
import type { PlaceDetailsResponse } from "../transport/client";
import { createRedisClientGetter } from "../../../shared/redis";
import {
  COMMUNITY_AUDIENCE_DELTA_TTL_SECONDS,
  PLACE_DETAILS_CACHE_TTL_SECONDS,
  getCommunityAudienceCacheKey,
  getCommunityCacheKey,
  getCommunityCacheTtlSeconds,
  getCommunityCategoryCacheKey,
  getCommunitySeasonalCacheKey,
  getCityDescriptionCacheKey,
  getPlaceDetailsCacheKey,
  getPlacePoolCacheKey,
  isPoolStale
} from "./keys";
import type {
  AudienceDelta,
  CachedPlacePool,
  CachedPlacePoolItem,
  CityDescriptionCachePayload
} from "./types";

type LoggerLike = {
  info: (context: unknown, message?: string) => void;
  warn: (context: unknown, message?: string) => void;
};

export function createCommunityCache(logger: LoggerLike) {
  const getRedisClient = createRedisClientGetter({
    logger,
    missingEnvMessage: "Upstash Redis env vars missing; cache disabled",
    initializedMessage: "Upstash Redis client initialized (community data)"
  });

  return {
    isPoolStale,

    async getCachedCityDescription(
      city: string,
      state: string
    ): Promise<CityDescriptionCachePayload | null> {
      const redis = getRedisClient();
      if (!redis) return null;
      try {
        return await redis.get<CityDescriptionCachePayload>(
          getCityDescriptionCacheKey(city, state)
        );
      } catch (error) {
        logger.warn(
          {
            city,
            state,
            error: error instanceof Error ? error.message : String(error)
          },
          "Failed to read city description from cache"
        );
        return null;
      }
    },

    async setCachedCityDescription(
      city: string,
      state: string,
      payload: CityDescriptionCachePayload
    ): Promise<void> {
      const redis = getRedisClient();
      if (!redis) return;
      try {
        await redis.set(getCityDescriptionCacheKey(city, state), payload);
      } catch (error) {
        logger.warn(
          {
            city,
            state,
            error: error instanceof Error ? error.message : String(error)
          },
          "Failed to write city description to cache"
        );
      }
    },

    async getCachedCommunityData(
      zipCode: string,
      city?: string | null,
      state?: string | null
    ): Promise<CommunityData | null> {
      const redis = getRedisClient();
      if (!redis) return null;
      try {
        const cached = await redis.get<CommunityData>(
          getCommunityCacheKey(zipCode, city, state)
        );
        return cached ?? null;
      } catch (error) {
        logger.warn(
          {
            zipCode,
            error: error instanceof Error ? error.message : String(error)
          },
          "Failed to read community data from cache"
        );
        return null;
      }
    },

    async setCachedCommunityData(
      zipCode: string,
      payload: CommunityData,
      city?: string | null,
      state?: string | null
    ): Promise<void> {
      const redis = getRedisClient();
      if (!redis) return;
      try {
        await redis.set(getCommunityCacheKey(zipCode, city, state), payload, {
          ex: getCommunityCacheTtlSeconds()
        });
      } catch (error) {
        logger.warn(
          {
            zipCode,
            error: error instanceof Error ? error.message : String(error)
          },
          "Failed to write community data to cache"
        );
      }
    },

    async getCachedCommunityCategoryList(
      zipCode: string,
      category: string,
      city?: string | null,
      state?: string | null
    ): Promise<string | null> {
      const redis = getRedisClient();
      if (!redis) return null;
      try {
        const cached = await redis.get<string>(
          getCommunityCategoryCacheKey(zipCode, category, city, state)
        );
        return cached ?? null;
      } catch (error) {
        logger.warn(
          {
            zipCode,
            category,
            error: error instanceof Error ? error.message : String(error)
          },
          "Failed to read community category list from cache"
        );
        return null;
      }
    },

    async setCachedCommunityCategoryList(
      zipCode: string,
      category: string,
      list: string,
      city?: string | null,
      state?: string | null
    ): Promise<void> {
      const redis = getRedisClient();
      if (!redis) return;
      try {
        await redis.set(
          getCommunityCategoryCacheKey(zipCode, category, city, state),
          list,
          { ex: getCommunityCacheTtlSeconds() }
        );
      } catch (error) {
        logger.warn(
          {
            zipCode,
            category,
            error: error instanceof Error ? error.message : String(error)
          },
          "Failed to write community category list to cache"
        );
      }
    },

    async getCachedSeasonalSections(
      zipCode: string,
      city?: string | null,
      state?: string | null
    ): Promise<Record<string, string> | null> {
      const redis = getRedisClient();
      if (!redis) return null;
      try {
        const cached = await redis.get<Record<string, string>>(
          getCommunitySeasonalCacheKey(zipCode, city, state)
        );
        return cached ?? null;
      } catch (error) {
        logger.warn(
          {
            zipCode,
            error: error instanceof Error ? error.message : String(error)
          },
          "Failed to read seasonal sections from cache"
        );
        return null;
      }
    },

    async setCachedSeasonalSections(
      zipCode: string,
      sections: Record<string, string>,
      city?: string | null,
      state?: string | null
    ): Promise<void> {
      const redis = getRedisClient();
      if (!redis) return;
      try {
        await redis.set(
          getCommunitySeasonalCacheKey(zipCode, city, state),
          sections,
          { ex: getCommunityCacheTtlSeconds() }
        );
      } catch (error) {
        logger.warn(
          {
            zipCode,
            error: error instanceof Error ? error.message : String(error)
          },
          "Failed to write seasonal sections to cache"
        );
      }
    },

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
        fetchedAt: new Date().toISOString(),
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
