import { Redis } from "@upstash/redis";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
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
  createRedisClient?: (url: string, token: string) => RedisLike;
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

export function createMarketDataService(deps: MarketDataServiceDeps = {}) {
  const env = deps.env ?? process.env;
  const fetcher = deps.fetcher ?? fetch;
  const now = deps.now ?? (() => new Date());
  const logger =
    deps.logger ??
    createChildLogger(baseLogger, {
      module: "market-data-service"
    });
  const createRedisClient =
    deps.createRedisClient ??
    ((url: string, token: string) => {
      const client = new Redis({ url, token });
      return {
        get: <T>(key: string) => client.get<T>(key),
        set: async (key: string, value: unknown, options?: { ex?: number }) => {
          if (typeof options?.ex === "number") {
            return client.set(key, value, { ex: options.ex });
          }
          return client.set(key, value);
        }
      };
    });

  let redisClient: RedisLike | null | undefined;

  const getRedisClient = (): RedisLike | null => {
    if (redisClient !== undefined) {
      return redisClient;
    }

    const url = env.KV_REST_API_URL;
    const token = env.KV_REST_API_TOKEN;
    if (!url || !token) {
      logger.warn(
        { hasUrl: Boolean(url), hasToken: Boolean(token) },
        "Upstash Redis env vars missing; cache disabled"
      );
      redisClient = null;
      return redisClient;
    }

    redisClient = createRedisClient(url, token);
    logger.info({}, "Upstash Redis client initialized (market data)");
    return redisClient ?? null;
  };

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
