import type { MarketData } from "./types";

export type RedisLike = {
  get: <T>(key: string) => Promise<T | null>;
  set: (key: string, value: unknown, options?: { ex?: number }) => Promise<unknown>;
};

export type CacheLogger = {
  warn: (obj: unknown, msg?: string) => void;
};

export async function readMarketCache(params: {
  redis: RedisLike | null;
  key: string;
  logger: CacheLogger;
  errorMessage: string;
}): Promise<MarketData | null> {
  const { redis, key, logger, errorMessage } = params;
  if (!redis) {
    return null;
  }

  try {
    return await redis.get<MarketData>(key);
  } catch (error) {
    logger.warn({ error, key }, errorMessage);
    return null;
  }
}

export async function writeMarketCache(params: {
  redis: RedisLike | null;
  key: string;
  value: MarketData;
  ttlSeconds: number;
  logger: CacheLogger;
  errorMessage: string;
}): Promise<void> {
  const { redis, key, value, ttlSeconds, logger, errorMessage } = params;
  if (!redis) {
    return;
  }

  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (error) {
    logger.warn({ error, key }, errorMessage);
  }
}
