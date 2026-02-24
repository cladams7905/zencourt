import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import {
  getSharedRedisClient,
  type Redis
} from "@web/src/server/services/cache/redis";
import type { MarketData, MarketLocation } from "./types";
import { readMarketCache, type RedisLike, writeMarketCache } from "./cache";
import {
  createMarketDataProviderRegistry,
  type MarketDataProviderStrategy
} from "./registry";

type LoggerLike = {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
};

export type MarketDataServiceDeps = {
  env?: NodeJS.ProcessEnv;
  fetcher?: typeof fetch;
  now?: () => Date;
  logger?: LoggerLike;
  getRedisClient?: () => RedisLike | null;
};

function getCacheTtlSeconds(
  env: NodeJS.ProcessEnv,
  envKey: string,
  fallbackDays: number
): number {
  const override = env[envKey];
  if (!override) {
    return fallbackDays * 24 * 60 * 60;
  }

  const parsed = Number.parseInt(override, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackDays * 24 * 60 * 60;
  }

  return parsed * 24 * 60 * 60;
}

function toRedisLike(redis: Redis | null): RedisLike | null {
  if (!redis) return null;
  return {
    get: <T>(key: string) => redis.get<T>(key),
    set: (key: string, value: unknown, options?: { ex?: number }) =>
      options?.ex != null
        ? redis.set(key, value, { ex: options.ex }).then(() => undefined)
        : redis.set(key, value).then(() => undefined)
  };
}

export function createMarketDataService(deps: MarketDataServiceDeps = {}) {
  const env = deps.env ?? process.env;
  const fetcher = deps.fetcher ?? fetch;
  const now = deps.now ?? (() => new Date());
  const logger =
    deps.logger ??
    createChildLogger(baseLogger, {
      module: "market-data-service"
    });
  const getRedisClient =
    deps.getRedisClient ?? (() => toRedisLike(getSharedRedisClient()));

  const providerRegistry = createMarketDataProviderRegistry({
    env,
    logger,
    fetcher,
    now
  });

  async function getProviderMarketData(
    provider: MarketDataProviderStrategy,
    location: MarketLocation
  ): Promise<MarketData | null> {
    const redis = getRedisClient();
    const cacheKey = `${provider.cacheKeyPrefix}:${location.zip_code}`;
    const cached = await readMarketCache({
      redis,
      key: cacheKey,
      logger,
      errorMessage: `Failed to read ${provider.name} market cache`
    });
    if (cached) {
      return cached;
    }

    const data = await provider.getMarketData(location);
    if (!data) {
      return null;
    }

    await writeMarketCache({
      redis,
      key: cacheKey,
      value: data,
      ttlSeconds: getCacheTtlSeconds(
        env,
        provider.cacheTtlEnvKey,
        provider.cacheTtlFallbackDays
      ),
      logger,
      errorMessage: `Failed to write ${provider.name} market cache`
    });

    return data;
  }

  async function getMarketData(
    location: MarketLocation
  ): Promise<MarketData | null> {
    const chain = providerRegistry.getProviderChain();
    for (let i = 0; i < chain.length; i += 1) {
      const provider = chain[i];
      const data = await getProviderMarketData(provider, location);
      if (data) {
        return data;
      }
      if (i < chain.length - 1) {
        logger.warn(
          {
            city: location.city,
            state: location.state,
            zip: location.zip_code
          },
          `${provider.displayName} market data unavailable; falling back to ${chain[i + 1].displayName}`
        );
      }
    }
    return null;
  }

  return {
    getMarketData
  };
}
