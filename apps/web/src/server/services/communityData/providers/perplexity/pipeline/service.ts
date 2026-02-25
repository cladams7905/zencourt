import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import type { CommunityData } from "@web/src/lib/domain/market/types";
import { ALL_CATEGORY_KEYS, getUtcMonthKey } from "../../../shared/common";
import type {
  AudienceSegment,
  CategoryKey
} from "@web/src/server/services/_config/community";
import { buildCategoryList, buildPerplexityCommunityData } from "./assembly";
import {
  fetchPerplexityCategoryPayload,
  fetchPerplexityMonthlyEventsPayload,
  formatAudienceLabel,
  type OriginLocation
} from "./fetching";
import { formatPerplexityCategoryList } from "./formatting";

const logger = createChildLogger(baseLogger, {
  module: "community-perplexity-service"
});

export async function getPerplexityMonthlyEventsSection(params: {
  zipCode: string;
  location: OriginLocation;
  audience?: AudienceSegment;
  now?: Date;
}): Promise<{ key: string; value: string } | null> {
  const audienceLabel = formatAudienceLabel(params.audience);
  const monthKey = getUtcMonthKey(params.now);
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
  const audienceLabel = formatAudienceLabel(params.audience);
  const results = await Promise.all(
    uniqueCategories.map(async (category) => {
      const payload = await fetchPerplexityCategoryPayload({
        zipCode: params.zipCode,
        category,
        audience: params.audience,
        location: params.location,
        serviceAreas: params.serviceAreas,
        forceRefresh: params.forceRefresh,
        avoidRecommendations: params.avoidRecommendations?.[category] ?? null
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

  const seasonalSections =
    params.eventsSection && params.eventsSection.value
      ? { [params.eventsSection.key]: params.eventsSection.value }
      : {};

  return buildPerplexityCommunityData({
    zipCode: params.zipCode,
    location: params.location,
    listMap,
    seasonalSections
  });
}

export async function getPerplexityCommunityData(params: {
  zipCode: string;
  location: OriginLocation;
  audience?: AudienceSegment;
  serviceAreas?: string[] | null;
  now?: Date;
}): Promise<CommunityData> {
  const { zipCode, location, audience, serviceAreas } = params;
  const results = await Promise.all(
    ALL_CATEGORY_KEYS.map(async (category) => {
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

  const monthKey = getUtcMonthKey(params.now);
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
      ? { [`things_to_do_${monthKey}`]: monthlyList }
      : {};

  const communityData = buildPerplexityCommunityData({
    zipCode,
    location,
    listMap,
    seasonalSections
  });

  if (Object.keys(seasonalSections).length > 0) {
    logger.info(
      { zipCode, audience, monthKey },
      "Perplexity monthly events cached"
    );
  }

  return communityData;
}
