import type { CommunityData } from "@web/src/types/market";
import { createChildLogger, logger as baseLogger } from "@web/src/lib/logger";
import {
  getCategoryDisplayLimit,
  shouldIncludeServiceAreasInCache,
  type AudienceSegment,
  type CategoryKey,
  type CommunityCategoryPayload
} from "../communityDataConfig";
import {
  buildCommunityCategoryPayload,
  buildPerplexityCommunityMessages,
  buildPerplexityResponseFormat,
  getCachedPerplexityCategoryPayload,
  getCachedPerplexityMonthlyEventsPayload,
  getAudienceLabel,
  requestPerplexity,
  setCachedPerplexityCategoryPayload,
  setCachedPerplexityMonthlyEventsPayload
} from "./index";
import { formatPerplexityCategoryList } from "./formatter";

const logger = createChildLogger(baseLogger, {
  module: "community-perplexity-service"
});

type OriginLocation = {
  city: string;
  state: string;
  lat: number;
  lng: number;
};

type PerplexityCommunityParams = {
  zipCode: string;
  location: OriginLocation;
  audience?: AudienceSegment;
  serviceAreas?: string[] | null;
};

const CATEGORY_KEYS: CategoryKey[] = [
  "neighborhoods",
  "dining",
  "coffee_brunch",
  "nature_outdoors",
  "entertainment",
  "attractions",
  "sports_rec",
  "arts_culture",
  "nightlife_social",
  "fitness_wellness",
  "shopping",
  "education",
  "community_events"
];

const MONTH_KEYS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december"
] as const;

type MonthKey = (typeof MONTH_KEYS)[number];

const MONTH_SEASONAL_HINTS: Record<MonthKey, string> = {
  january: "Prioritize winter activities and cozy indoor events.",
  february: "Prioritize winter activities and cozy indoor events.",
  march: "Prioritize early spring activities and seasonal transitions.",
  april: "Prioritize spring activities and outdoor events.",
  may: "Prioritize spring outings, festivals, and outdoor activities.",
  june: "Prioritize summer activities and outdoor events.",
  july: "Prioritize summer activities, outdoor events, and local celebrations.",
  august: "Prioritize summer activities, outdoor events, and late-summer outings.",
  september: "Prioritize early fall activities, festivals, and outdoor events.",
  october: "Prioritize fall activities, halloween events, and seasonal outings.",
  november: "Prioritize late-fall activities and holiday lead-in events.",
  december: "Prioritize winter activities and holiday-season events."
};

function getUtcMonthKey(date = new Date()): MonthKey {
  return MONTH_KEYS[date.getUTCMonth()] ?? "january";
}

function getServiceAreasForCategory(
  category: CategoryKey,
  serviceAreas?: string[] | null
): string[] | null {
  if (!shouldIncludeServiceAreasInCache(category)) {
    return null;
  }
  return serviceAreas ?? null;
}

async function fetchPerplexityCategoryPayload(params: {
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
      ? `Try to avoid recommending these places if possible: ${trimmedAvoidList.join(
          ", "
        )}. If you cannot find enough alternatives, you may include items from this list.`
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

async function fetchPerplexityMonthlyEventsPayload(params: {
  zipCode: string;
  monthKey: MonthKey;
  audience?: AudienceSegment;
  location: OriginLocation;
}): Promise<CommunityCategoryPayload | null> {
  const cacheParams = {
    zipCode: params.zipCode,
    monthKey: params.monthKey,
    audience: params.audience,
    city: params.location.city,
    state: params.location.state
  };

  const cached = await getCachedPerplexityMonthlyEventsPayload(cacheParams);
  if (cached) {
    logger.info(
      { zipCode: params.zipCode, monthKey: params.monthKey, audience: params.audience },
      "Perplexity monthly events cache hit"
    );
    return cached;
  }

  const limit = getCategoryDisplayLimit("community_events");
  const monthLabel = params.monthKey[0].toUpperCase() + params.monthKey.slice(1);
  const seasonalHint = MONTH_SEASONAL_HINTS[params.monthKey];
  const extraInstructions =
    `Focus on seasonal activities and events happening in ${monthLabel}. ${seasonalHint}`;

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
    response_format: buildPerplexityResponseFormat("community_events", params.audience)
  });

  if (!response) {
    logger.warn(
      { zipCode: params.zipCode, monthKey: params.monthKey, audience: params.audience },
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
      { zipCode: params.zipCode, monthKey: params.monthKey, audience: params.audience },
      "Perplexity monthly events payload empty"
    );
    return null;
  }

  await setCachedPerplexityMonthlyEventsPayload(payload, cacheParams);
  return payload;
}

function buildCategoryList(
  category: CategoryKey,
  payload: CommunityCategoryPayload | null,
  audienceLabel?: string
): string {
  if (!payload || !payload.items || payload.items.length === 0) {
    return "- (none found)";
  }
  return formatPerplexityCategoryList(category, payload.items, audienceLabel);
}

export async function getPerplexityMonthlyEventsSection(params: {
  zipCode: string;
  location: OriginLocation;
  audience?: AudienceSegment;
}): Promise<{ key: string; value: string } | null> {
  const audienceLabel = getAudienceLabel(params.audience);
  const monthKey = getUtcMonthKey();
  const monthlyPayload = await fetchPerplexityMonthlyEventsPayload({
    zipCode: params.zipCode,
    monthKey,
    audience: params.audience,
    location: params.location
  });
  if (!monthlyPayload || monthlyPayload.items.length === 0) {
    return null;
  }
  const value = formatPerplexityCategoryList(
    "community_events",
    monthlyPayload.items,
    audienceLabel
  );
  if (!value || value.includes("(none found)")) {
    return null;
  }
  return { key: `things_to_do_${monthKey}`, value };
}

export async function prefetchPerplexityCategories(params: {
  zipCode: string;
  location: OriginLocation;
  audience?: AudienceSegment;
  serviceAreas?: string[] | null;
  categories: CategoryKey[];
}): Promise<void> {
  const uniqueCategories = Array.from(new Set(params.categories));
  await Promise.all(
    uniqueCategories.map(async (category) => {
      await fetchPerplexityCategoryPayload({
        zipCode: params.zipCode,
        category,
        audience: params.audience,
        location: params.location,
        serviceAreas: params.serviceAreas
      });
    })
  );
}

export async function getPerplexityCommunityDataForCategories(params: {
  zipCode: string;
  location: OriginLocation;
  audience?: AudienceSegment;
  serviceAreas?: string[] | null;
  categories: CategoryKey[];
  eventsSection?: { key: string; value: string } | null;
  forceRefresh?: boolean;
  avoidRecommendations?: Partial<Record<CategoryKey, string[]>> | null;
}): Promise<CommunityData> {
  const uniqueCategories = Array.from(new Set(params.categories));
  const audienceLabel = getAudienceLabel(params.audience);
  const results = await Promise.all(
    uniqueCategories.map(async (category) => {
      const payload = await fetchPerplexityCategoryPayload({
        zipCode: params.zipCode,
        category,
        audience: params.audience,
        location: params.location,
        serviceAreas: params.serviceAreas,
        forceRefresh: params.forceRefresh,
        avoidRecommendations:
          params.avoidRecommendations?.[category] ?? null
      });
      return {
        category,
        list: buildCategoryList(category, payload, audienceLabel)
      };
    })
  );

  const listMap = new Map<CategoryKey, string>();
  for (const result of results) {
    listMap.set(result.category, result.list);
  }

  const neighborhoods =
    listMap.get("neighborhoods") ?? "- (none found)";

  const seasonalSections =
    params.eventsSection && params.eventsSection.value
      ? { [params.eventsSection.key]: params.eventsSection.value }
      : {};

  return {
    city: params.location.city,
    state: params.location.state,
    zip_code: params.zipCode,
    data_timestamp: new Date().toISOString(),
    neighborhoods_list: neighborhoods,
    neighborhoods_family_list: neighborhoods,
    neighborhoods_luxury_list: neighborhoods,
    neighborhoods_senior_list: neighborhoods,
    neighborhoods_relocators_list: neighborhoods,
    dining_list: listMap.get("dining") ?? "- (none found)",
    coffee_brunch_list: listMap.get("coffee_brunch") ?? "- (none found)",
    nature_outdoors_list: listMap.get("nature_outdoors") ?? "- (none found)",
    shopping_list: listMap.get("shopping") ?? "- (none found)",
    entertainment_list: listMap.get("entertainment") ?? "- (none found)",
    arts_culture_list: listMap.get("arts_culture") ?? "- (none found)",
    attractions_list: listMap.get("attractions") ?? "- (none found)",
    sports_rec_list: listMap.get("sports_rec") ?? "- (none found)",
    nightlife_social_list: listMap.get("nightlife_social") ?? "- (none found)",
    fitness_wellness_list:
      listMap.get("fitness_wellness") ?? "- (none found)",
    education_list: listMap.get("education") ?? "- (none found)",
    community_events_list: listMap.get("community_events") ?? "- (none found)",
    seasonal_geo_sections: seasonalSections
  };
}

export async function getPerplexityCommunityData(
  params: PerplexityCommunityParams
) {
  const { zipCode, location, audience, serviceAreas } = params;
  const results = await Promise.all(
    CATEGORY_KEYS.map(async (category) => {
      const payload = await fetchPerplexityCategoryPayload({
        zipCode,
        category,
        audience,
        location,
        serviceAreas
      });
      return {
        category,
        list: buildCategoryList(category, payload)
      };
    })
  );

  const listMap = new Map<CategoryKey, string>();
  for (const result of results) {
    listMap.set(result.category, result.list);
  }

  const neighborhoods = listMap.get("neighborhoods") ?? "- (none found)";

  const monthKey = getUtcMonthKey();
  const monthlyPayload = await fetchPerplexityMonthlyEventsPayload({
    zipCode,
    monthKey,
    audience,
    location
  });
  const monthlyList = monthlyPayload
    ? formatPerplexityCategoryList("community_events", monthlyPayload.items)
    : "- (none found)";
  const seasonalSections =
    monthlyList && !monthlyList.includes("(none found)")
      ? { [`events_${monthKey}`]: monthlyList }
      : {};

  const communityData: CommunityData = {
    city: location.city,
    state: location.state,
    zip_code: zipCode,
    data_timestamp: new Date().toISOString(),
    neighborhoods_list: neighborhoods,
    neighborhoods_family_list: neighborhoods,
    neighborhoods_luxury_list: neighborhoods,
    neighborhoods_senior_list: neighborhoods,
    neighborhoods_relocators_list: neighborhoods,
    dining_list: listMap.get("dining") ?? "- (none found)",
    coffee_brunch_list: listMap.get("coffee_brunch") ?? "- (none found)",
    nature_outdoors_list: listMap.get("nature_outdoors") ?? "- (none found)",
    shopping_list: listMap.get("shopping") ?? "- (none found)",
    entertainment_list: listMap.get("entertainment") ?? "- (none found)",
    arts_culture_list: listMap.get("arts_culture") ?? "- (none found)",
    attractions_list: listMap.get("attractions") ?? "- (none found)",
    sports_rec_list: listMap.get("sports_rec") ?? "- (none found)",
    nightlife_social_list: listMap.get("nightlife_social") ?? "- (none found)",
    fitness_wellness_list: listMap.get("fitness_wellness") ?? "- (none found)",
    education_list: listMap.get("education") ?? "- (none found)",
    community_events_list: listMap.get("community_events") ?? "- (none found)",
    seasonal_geo_sections: seasonalSections
  };

  if (Object.keys(seasonalSections).length > 0) {
    logger.info(
      { zipCode, audience, monthKey },
      "Perplexity monthly events cached"
    );
  }

  return communityData;
}
