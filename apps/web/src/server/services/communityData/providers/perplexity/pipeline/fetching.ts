import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import {
  getCategoryDisplayLimit,
  shouldIncludeServiceAreasInCache,
  type AudienceSegment,
  type CategoryKey,
  type CommunityCategoryPayload
} from "@web/src/server/services/_config/community";
import { getUtcMonthKey } from "../../../shared/common";
import { buildCommunityCategoryPayload } from "./parsing";
import {
  buildPerplexityCommunityMessages,
  getAudienceLabel
} from "../transport/prompts";
import { buildPerplexityResponseFormat } from "../transport/schema";
import {
  getCachedPerplexityCategoryPayload,
  getCachedPerplexityMonthlyEventsPayload,
  setCachedPerplexityCategoryPayload,
  setCachedPerplexityMonthlyEventsPayload
} from "../cache";
import { requestPerplexity } from "@web/src/server/services/_integrations/perplexity";

const logger = createChildLogger(baseLogger, {
  module: "community-perplexity-service"
});

export type OriginLocation = {
  city: string;
  state: string;
  lat: number;
  lng: number;
};

type MonthKey = ReturnType<typeof getUtcMonthKey>;

const MONTH_SEASONAL_HINTS: Record<MonthKey, string> = {
  january: "Prioritize winter activities and cozy indoor events.",
  february: "Prioritize winter activities and cozy indoor events.",
  march: "Prioritize early spring activities and seasonal transitions.",
  april: "Prioritize spring activities and outdoor events.",
  may: "Prioritize spring outings, festivals, and outdoor activities.",
  june: "Prioritize summer activities and outdoor events.",
  july: "Prioritize summer activities, outdoor events, and local celebrations.",
  august:
    "Prioritize summer activities, outdoor events, and late-summer outings.",
  september: "Prioritize early fall activities, festivals, and outdoor events.",
  october:
    "Prioritize fall activities, halloween events, and seasonal outings.",
  november: "Prioritize late-fall activities and holiday lead-in events.",
  december: "Prioritize winter activities and holiday-season events."
};

function getServiceAreasForCategory(
  category: CategoryKey,
  serviceAreas?: string[] | null
): string[] | null {
  if (!shouldIncludeServiceAreasInCache(category)) {
    return null;
  }
  return serviceAreas ?? null;
}

export async function fetchPerplexityCategoryPayload(params: {
  zipCode: string;
  category: CategoryKey;
  audience?: AudienceSegment;
  location: OriginLocation;
  serviceAreas?: string[] | null;
  extraInstructions?: string;
  avoidRecommendations?: string[] | null;
  forceRefresh?: boolean;
}): Promise<CommunityCategoryPayload | null> {
  const { zipCode, category, audience, location, serviceAreas } = params;
  const cacheParams = {
    zipCode,
    category,
    audience,
    serviceAreas: getServiceAreasForCategory(category, serviceAreas),
    city: location.city,
    state: location.state
  };

  if (!params.forceRefresh) {
    const cached = await getCachedPerplexityCategoryPayload(cacheParams);
    if (cached) {
      logger.info(
        { zipCode, category, audience, cached: true },
        "Perplexity category cache hit"
      );
      return cached;
    }
  }

  const limit = getCategoryDisplayLimit(category);
  const trimmedAvoidList = (params.avoidRecommendations ?? [])
    .map((name) => name.trim())
    .filter(Boolean)
    .slice(0, Math.max(8, limit * 2));
  const avoidInstructions =
    trimmedAvoidList.length > 0
      ? `Try to avoid recommending these places if possible: ${trimmedAvoidList.join(", ")}. If you cannot find enough alternatives, you may include items from this list.`
      : "";

  const messages = buildPerplexityCommunityMessages({
    category,
    audience,
    city: location.city,
    state: location.state,
    zipCode,
    serviceAreas: cacheParams.serviceAreas,
    limit,
    extraInstructions: [params.extraInstructions, avoidInstructions]
      .filter(Boolean)
      .join(" ")
  });

  const response = await requestPerplexity({
    messages,
    response_format: buildPerplexityResponseFormat(category, audience)
  });

  if (!response) {
    logger.warn(
      { zipCode, category, audience },
      "Perplexity category request failed"
    );
    return null;
  }

  const payload = buildCommunityCategoryPayload({
    category,
    audience,
    zipCode,
    city: location.city,
    state: location.state,
    response,
    maxItems: limit
  });

  if (!payload) {
    logger.warn(
      { zipCode, category, audience },
      "Perplexity category payload empty"
    );
    return null;
  }

  await setCachedPerplexityCategoryPayload(payload, cacheParams);
  return payload;
}

export async function fetchPerplexityMonthlyEventsPayload(params: {
  zipCode: string;
  monthKey?: MonthKey;
  audience?: AudienceSegment;
  location: OriginLocation;
}): Promise<CommunityCategoryPayload | null> {
  const monthKey = params.monthKey ?? getUtcMonthKey();
  const cacheParams = {
    zipCode: params.zipCode,
    monthKey,
    audience: params.audience,
    city: params.location.city,
    state: params.location.state
  };

  const cached = await getCachedPerplexityMonthlyEventsPayload(cacheParams);
  if (cached) {
    logger.info(
      { zipCode: params.zipCode, monthKey, audience: params.audience },
      "Perplexity monthly events cache hit"
    );
    return cached;
  }

  const limit = getCategoryDisplayLimit("community_events");
  const monthLabel = monthKey[0].toUpperCase() + monthKey.slice(1);
  const seasonalHint = MONTH_SEASONAL_HINTS[monthKey];
  const extraInstructions = `Focus on seasonal activities and events happening in ${monthLabel}. ${seasonalHint}`;

  const messages = buildPerplexityCommunityMessages({
    category: "community_events",
    audience: params.audience,
    city: params.location.city,
    state: params.location.state,
    zipCode: params.zipCode,
    limit,
    extraInstructions
  });

  const response = await requestPerplexity({
    messages,
    response_format: buildPerplexityResponseFormat(
      "community_events",
      params.audience
    )
  });

  if (!response) {
    logger.warn(
      { zipCode: params.zipCode, monthKey, audience: params.audience },
      "Perplexity monthly events request failed"
    );
    return null;
  }

  const payload = buildCommunityCategoryPayload({
    category: "community_events",
    audience: params.audience,
    zipCode: params.zipCode,
    city: params.location.city,
    state: params.location.state,
    response,
    maxItems: limit
  });

  if (!payload) {
    logger.warn(
      { zipCode: params.zipCode, monthKey, audience: params.audience },
      "Perplexity monthly events payload empty"
    );
    return null;
  }

  await setCachedPerplexityMonthlyEventsPayload(payload, cacheParams);
  return payload;
}

export function formatAudienceLabel(audience?: AudienceSegment): string {
  return getAudienceLabel(audience);
}
