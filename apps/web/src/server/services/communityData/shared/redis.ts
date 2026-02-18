import { Redis } from "@upstash/redis";

type LoggerLike = {
  info: (context: unknown, message?: string) => void;
  warn: (context: unknown, message?: string) => void;
};

type Options = {
  logger: LoggerLike;
  missingEnvMessage: string;
  initializedMessage: string;
};

export function createRedisClientGetter(options: Options): () => Redis | null {
  let redisClient: Redis | null | undefined;

  return () => {
    if (redisClient !== undefined) {
      return redisClient;
    }

    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;

    if (!url || !token) {
      options.logger.warn(
        { hasUrl: Boolean(url), hasToken: Boolean(token) },
        options.missingEnvMessage
      );
      redisClient = null;
      return redisClient;
    }

    redisClient = new Redis({ url, token });
    options.logger.info({}, options.initializedMessage);
    return redisClient;
  };
}
