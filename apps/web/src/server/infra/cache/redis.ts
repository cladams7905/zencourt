import { Redis } from "@upstash/redis";
export type { Redis };
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";

const logger = createChildLogger(baseLogger, { module: "redis-client" });

let redisClient: Redis | null | undefined;

export function getSharedRedisClient(): Redis | null {
  if (redisClient !== undefined) {
    return redisClient;
  }

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    logger.warn(
      { hasUrl: Boolean(url), hasToken: Boolean(token) },
      "Upstash Redis env vars missing; cache disabled"
    );
    redisClient = null;
    return redisClient;
  }

  redisClient = new Redis({ url, token });
  logger.debug("Upstash Redis client initialized");
  return redisClient;
}
