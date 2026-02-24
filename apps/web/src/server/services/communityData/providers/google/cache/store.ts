import type { CommunityData } from "@web/src/lib/domain/market/types";
import { getSharedRedisClient } from "@web/src/server/services/cache/redis";
import {
  getCommunityCacheKey,
  getCommunityCacheTtlSeconds,
  getCommunityCategoryCacheKey,
  getCommunitySeasonalCacheKey,
  getCityDescriptionCacheKey,
  isPoolStale
} from "./keys";
import type {
  CityDescriptionCachePayload
} from "./types";
import { createPlaceCacheOps } from "./placeOps";

type LoggerLike = {
  info: (context: unknown, message?: string) => void;
  warn: (context: unknown, message?: string) => void;
};

export function createCommunityCache(
  logger: LoggerLike,
  deps: { now?: () => Date } = {}
) {
  const now = deps.now ?? (() => new Date());
  const getRedisClient = () => getSharedRedisClient();

  return {
    isPoolStale,
    ...createPlaceCacheOps({
      getRedisClient,
      logger,
      now
    }),

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

  };
}
