import { createChildLogger, logger as baseLogger } from "@web/src/lib/core/logging/logger";
import {
  COMMUNITY_CACHE_KEY_PREFIX,
  shouldIncludeServiceAreasInCache,
  type AudienceSegment,
  type CategoryKey,
  type CommunityCategoryPayload
} from "@web/src/server/services/community/config";
import {
  buildServiceAreasSignature,
  getSecondsUntilEndOfMonth,
  slugify
} from "../../../shared/common";
import { createRedisClientGetter } from "../../../shared/redis";

const logger = createChildLogger(baseLogger, {
  module: "community-perplexity-cache"
});

const getRedisClient = createRedisClientGetter({
  logger,
  missingEnvMessage: "Upstash Redis env vars missing; Perplexity cache disabled",
  initializedMessage: "Upstash Redis client initialized (community perplexity)"
});

const CATEGORY_CACHE_TTL_SECONDS = 60 * 60 * 24 * 90;

function getMonthlyEventsTtlSeconds(): number {
  return getSecondsUntilEndOfMonth();
}

function getBaseCacheKey(
  zipCode: string,
  city?: string | null,
  state?: string | null
): string {
  if (city && state) {
    return `${COMMUNITY_CACHE_KEY_PREFIX}:perplexity:${zipCode}:${state.toUpperCase()}:${slugify(
      city
    )}`;
  }
  return `${COMMUNITY_CACHE_KEY_PREFIX}:perplexity:${zipCode}`;
}

export function getPerplexityCategoryCacheKey(params: {
  zipCode: string;
  category: CategoryKey;
  audience?: AudienceSegment;
  serviceAreas?: string[] | null;
  city?: string | null;
  state?: string | null;
}): string {
  const base = `${getBaseCacheKey(params.zipCode, params.city, params.state)}:cat:${
    params.category
  }`;
  const withAudience = params.audience ? `${base}:aud:${params.audience}` : base;

  if (!shouldIncludeServiceAreasInCache(params.category)) {
    return withAudience;
  }

  const signature = buildServiceAreasSignature(params.serviceAreas);
  return signature ? `${withAudience}:sa:${signature}` : withAudience;
}

export async function getCachedPerplexityCategoryPayload(params: {
  zipCode: string;
  category: CategoryKey;
  audience?: AudienceSegment;
  serviceAreas?: string[] | null;
  city?: string | null;
  state?: string | null;
}): Promise<CommunityCategoryPayload | null> {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }
  try {
    const cached = await redis.get<CommunityCategoryPayload>(
      getPerplexityCategoryCacheKey(params)
    );
    return cached ?? null;
  } catch (error) {
    logger.warn(
      {
        zipCode: params.zipCode,
        category: params.category,
        error: error instanceof Error ? error.message : String(error)
      },
      "Failed to read Perplexity category payload"
    );
    return null;
  }
}

export async function setCachedPerplexityCategoryPayload(
  payload: CommunityCategoryPayload,
  params: {
    zipCode: string;
    category: CategoryKey;
    audience?: AudienceSegment;
    serviceAreas?: string[] | null;
    city?: string | null;
    state?: string | null;
  }
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }
  try {
    await redis.set(getPerplexityCategoryCacheKey(params), payload, {
      ex: CATEGORY_CACHE_TTL_SECONDS
    });
  } catch (error) {
    logger.warn(
      {
        zipCode: params.zipCode,
        category: params.category,
        error: error instanceof Error ? error.message : String(error)
      },
      "Failed to write Perplexity category payload"
    );
  }
}

export function getPerplexityMonthlyEventsCacheKey(params: {
  zipCode: string;
  monthKey: string;
  audience?: AudienceSegment;
  city?: string | null;
  state?: string | null;
}): string {
  const base = `${getBaseCacheKey(params.zipCode, params.city, params.state)}:things_to_do:${
    params.monthKey
  }`;
  return params.audience ? `${base}:aud:${params.audience}` : base;
}

export async function getCachedPerplexityMonthlyEventsPayload(params: {
  zipCode: string;
  monthKey: string;
  audience?: AudienceSegment;
  city?: string | null;
  state?: string | null;
}): Promise<CommunityCategoryPayload | null> {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }
  try {
    const cached = await redis.get<CommunityCategoryPayload>(
      getPerplexityMonthlyEventsCacheKey(params)
    );
    return cached ?? null;
  } catch (error) {
    logger.warn(
      {
        zipCode: params.zipCode,
        monthKey: params.monthKey,
        error: error instanceof Error ? error.message : String(error)
      },
      "Failed to read Perplexity monthly events payload"
    );
    return null;
  }
}

export async function setCachedPerplexityMonthlyEventsPayload(
  payload: CommunityCategoryPayload,
  params: {
    zipCode: string;
    monthKey: string;
    audience?: AudienceSegment;
    city?: string | null;
    state?: string | null;
  }
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }
  try {
    await redis.set(getPerplexityMonthlyEventsCacheKey(params), payload, {
      ex: getMonthlyEventsTtlSeconds()
    });
  } catch (error) {
    logger.warn(
      {
        zipCode: params.zipCode,
        monthKey: params.monthKey,
        error: error instanceof Error ? error.message : String(error)
      },
      "Failed to write Perplexity monthly events payload"
    );
  }
}
