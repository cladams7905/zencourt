import { Redis } from "@upstash/redis";
import { createChildLogger, logger as baseLogger } from "@web/src/lib/core/logging/logger";
import type { MarketData, MarketLocation } from "./types";
import { fetchPerplexityMarketData } from "./providers/perplexity";
import { fetchRentCastMarketData } from "./providers/rentcast";
import {
  readMarketCache,
  type RedisLike,
  writeMarketCache
} from "./cache";

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

const DEFAULT_RENTCAST_TTL_DAYS = 30;
const DEFAULT_PERPLEXITY_TTL_DAYS = 30;
const DEFAULT_HTTP_TIMEOUT_MS = 10_000;
const RENTCAST_CACHE_KEY_PREFIX = "rentcast";
const PERPLEXITY_CACHE_KEY_PREFIX = "market:perplexity";

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

function getHttpTimeoutMs(
  env: NodeJS.ProcessEnv,
  envKey: string,
  fallbackMs = DEFAULT_HTTP_TIMEOUT_MS
): number {
  const raw = env[envKey];
  if (!raw) {
    return fallbackMs;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackMs;
  }

  return parsed;
}

function getMarketDataProvider(env: NodeJS.ProcessEnv): "perplexity" | "rentcast" {
  return env.MARKET_DATA_PROVIDER?.toLowerCase() === "rentcast"
    ? "rentcast"
    : "perplexity";
}

function getApiKey(
  env: NodeJS.ProcessEnv,
  keyName: "RENTCAST_API_KEY" | "FRED_API_KEY",
  logger: LoggerLike
): string | null {
  const apiKey = env[keyName];
  if (!apiKey) {
    logger.warn({ envKey: keyName }, `${keyName} is not configured`);
    return null;
  }
  return apiKey;
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
        set: async (
          key: string,
          value: unknown,
          options?: { ex?: number }
        ) => {
          if (typeof options?.ex === "number") {
            return client.set(key, value, { ex: options.ex });
          }
          return client.set(key, value);
        }
      };
    });

  const rentCastTimeoutMs = getHttpTimeoutMs(env, "RENTCAST_HTTP_TIMEOUT_MS");
  const fredTimeoutMs = getHttpTimeoutMs(
    env,
    "FRED_HTTP_TIMEOUT_MS",
    rentCastTimeoutMs
  );

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

  const getRentCastCacheKey = (zipCode: string): string =>
    `${RENTCAST_CACHE_KEY_PREFIX}:${zipCode}`;
  const getPerplexityCacheKey = (zipCode: string): string =>
    `${PERPLEXITY_CACHE_KEY_PREFIX}:${zipCode}`;

  async function getRentCastMarketData(location: MarketLocation): Promise<MarketData | null> {
    const redis = getRedisClient();
    const cacheKey = getRentCastCacheKey(location.zip_code);
    const cached = await readMarketCache({
      redis,
      key: cacheKey,
      logger,
      errorMessage: "Failed to read RentCast cache"
    });
    if (cached) {
      return cached;
    }

    const data = await fetchRentCastMarketData({
      location,
      rentCastApiKey: getApiKey(env, "RENTCAST_API_KEY", logger),
      fredApiKey: getApiKey(env, "FRED_API_KEY", logger),
      fetcher,
      now,
      logger,
      env,
      timeoutMs: rentCastTimeoutMs,
      fredTimeoutMs
    });

    if (!data) {
      return null;
    }

    await writeMarketCache({
      redis,
      key: cacheKey,
      value: data,
      ttlSeconds: getCacheTtlSeconds(
        env,
        "RENTCAST_CACHE_TTL_DAYS",
        DEFAULT_RENTCAST_TTL_DAYS
      ),
      logger,
      errorMessage: "Failed to write RentCast cache"
    });

    return data;
  }

  async function getPerplexityData(location: MarketLocation): Promise<MarketData | null> {
    const redis = getRedisClient();
    const cacheKey = getPerplexityCacheKey(location.zip_code);
    const cached = await readMarketCache({
      redis,
      key: cacheKey,
      logger,
      errorMessage: "Failed to read Perplexity market cache"
    });
    if (cached) {
      return cached;
    }

    const data = await fetchPerplexityMarketData(location, { logger, now });
    if (!data) {
      return null;
    }

    await writeMarketCache({
      redis,
      key: cacheKey,
      value: data,
      ttlSeconds: getCacheTtlSeconds(
        env,
        "MARKET_DATA_CACHE_TTL_DAYS",
        DEFAULT_PERPLEXITY_TTL_DAYS
      ),
      logger,
      errorMessage: "Failed to write Perplexity market cache"
    });

    return data;
  }

  async function getMarketData(location: MarketLocation): Promise<MarketData | null> {
    const provider = getMarketDataProvider(env);
    if (provider === "rentcast") {
      return getRentCastMarketData(location);
    }

    const perplexityData = await getPerplexityData(location);
    if (perplexityData) {
      return perplexityData;
    }

    logger.warn(
      { city: location.city, state: location.state, zip: location.zip_code },
      "Perplexity market data unavailable; falling back to RentCast"
    );

    return getRentCastMarketData(location);
  }

  return {
    getMarketData
  };
}
