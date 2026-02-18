import type { AudienceDelta, CommunityCache } from "../cache";
import type { PlaceDetailsResponse } from "../transport/client";
import type {
  CityRecord,
  DistanceCache,
  ServiceAreaDistanceCache
} from "./geo";
import type { QueryOverrides, SearchAnchor } from "./search";
import { fetchScoredPlacesForQueries, getSearchAnchors } from "./search";
import { formatPlaceList, dedupePlaces, type ScoredPlace } from "./places";
import { getPooledCategoryPlaces } from "./pools";
import {
  buildSeasonalQueries,
  estimateSearchCallsForQueries,
  mergeUniqueQueries,
  pickSeasonalCategories
} from "./seasonal";
import {
  AUDIENCE_AUGMENT_CATEGORIES,
  getAllAudienceAugmentQueries,
  getAudienceAugmentLimit,
  getCategoryDisplayLimit,
  getCategoryFallbackQueries,
  getCategoryMinPrimaryResults,
  getCategoryTargetQueryCount,
  type AudienceAugmentCategory,
  type CategoryKey
} from "@web/src/server/services/community/config";
import { getUtcMonthKey } from "../../../shared/common";
import { estimateGoogleCallsCostUsd } from "../../../shared/apiCost";
import { hydratePlacesFromItems } from "./places/details";

type LoggerLike = {
  info: (context: unknown, message?: string) => void;
  warn: (context: unknown, message?: string) => void;
};

export async function buildAudienceAugmentDelta(params: {
  location: CityRecord;
  audienceSegment: string;
  distanceCache: DistanceCache;
  serviceAreaCache: ServiceAreaDistanceCache | null | undefined;
  serviceAreas: string[] | null | undefined;
  zipCode: string;
  preferredCity?: string | null;
  preferredState?: string | null;
  communityCache: CommunityCache;
  logger: LoggerLike;
  anchorOffsets: SearchAnchor[];
  getPlaceDetailsCached: (
    placeId: string
  ) => Promise<PlaceDetailsResponse | null>;
  getQueryOverrides: (category: string, query: string) => QueryOverrides | null;
}): Promise<AudienceDelta> {
  const {
    location,
    audienceSegment,
    distanceCache,
    serviceAreaCache,
    serviceAreas,
    zipCode,
    preferredCity,
    preferredState,
    communityCache,
    logger,
    anchorOffsets,
    getPlaceDetailsCached,
    getQueryOverrides
  } = params;

  const queriesByCategory = getAllAudienceAugmentQueries(audienceSegment);
  if (!queriesByCategory) {
    return {};
  }

  const seasonalCategories = pickSeasonalCategories(
    `${zipCode}:${audienceSegment}:${getUtcMonthKey()}:aud`,
    AUDIENCE_AUGMENT_CATEGORIES,
    4
  );
  const allowedSeasonalCategories = new Set<CategoryKey>(seasonalCategories);
  const usedSeasonalHeaders = new Set<string>();
  const searchAnchorCount = getSearchAnchors(location, anchorOffsets).length;
  const delta: AudienceDelta = {};
  let searchCallsEstimated = 0;
  let fallbackSearchCallsEstimated = 0;
  let detailsCallsEstimated = 0;
  const categoriesFetched: AudienceAugmentCategory[] = [];
  const categoriesFromCache: AudienceAugmentCategory[] = [];

  logger.info(
    {
      zipCode,
      audienceSegment,
      month: getUtcMonthKey(),
      seasonalCategories
    },
    "Selected seasonal categories for audience delta"
  );

  for (const category of AUDIENCE_AUGMENT_CATEGORIES) {
    const rawQueries = queriesByCategory[category] ?? [];
    const fallbackQueries = getCategoryFallbackQueries(category);
    const desiredQueryCount = getCategoryTargetQueryCount(category);
    let combinedQueries = rawQueries;
    if (rawQueries.length === 0) {
      combinedQueries = fallbackQueries.slice(0, desiredQueryCount);
    } else if (rawQueries.length < desiredQueryCount) {
      combinedQueries = mergeUniqueQueries(
        rawQueries,
        fallbackQueries.slice(0, desiredQueryCount - rawQueries.length)
      );
    }

    const { queries: localizedQueries, seasonalQueries } = buildSeasonalQueries(
      location,
      category,
      combinedQueries,
      undefined,
      allowedSeasonalCategories,
      usedSeasonalHeaders
    );

    if (seasonalQueries.size > 0) {
      logger.info(
        {
          zipCode,
          audienceSegment,
          category,
          seasonalQueries: Array.from(seasonalQueries)
        },
        "Audience seasonal queries selected"
      );
    }

    if (localizedQueries.length === 0) {
      continue;
    }

    searchCallsEstimated += estimateSearchCallsForQueries(
      category,
      localizedQueries,
      seasonalQueries,
      searchAnchorCount
    );
    if (fallbackQueries.length > 0) {
      fallbackSearchCallsEstimated += estimateSearchCallsForQueries(
        category,
        fallbackQueries,
        new Set(),
        searchAnchorCount
      );
    }
    detailsCallsEstimated += getCategoryDisplayLimit(category);

    const maxPerQuery = getAudienceAugmentLimit(audienceSegment, category);

    const fetchAudiencePlaces = async (): Promise<ScoredPlace[]> => {
      let places = await fetchScoredPlacesForQueries({
        queries: localizedQueries,
        category,
        maxResults: maxPerQuery,
        location,
        distanceCache,
        anchorOffsets,
        serviceAreaCache,
        seasonalQueries
      });

      const minPrimary = getCategoryMinPrimaryResults(category);
      const deduped = dedupePlaces(places);
      if (minPrimary <= 0 || deduped.length < minPrimary) {
        if (fallbackQueries.length > 0) {
          const fallbackPlaces = await fetchScoredPlacesForQueries({
            queries: fallbackQueries,
            category,
            maxResults: maxPerQuery,
            location,
            distanceCache,
            anchorOffsets,
            serviceAreaCache,
            seasonalQueries,
            overridesForQuery: (query) => getQueryOverrides(category, query)
          });
          places = [...places, ...fallbackPlaces];
        }
      }

      return places;
    };

    const sampledItems = await getPooledCategoryPlaces(
      communityCache,
      logger,
      {
        zipCode,
        category,
        audience: audienceSegment,
        serviceAreas,
        city: preferredCity,
        state: preferredState
      },
      fetchAudiencePlaces
    );
    if (sampledItems.length > 0) {
      categoriesFromCache.push(category);
    } else {
      categoriesFetched.push(category);
    }

    const sampledPlaces = await hydratePlacesFromItems(
      sampledItems,
      category,
      getPlaceDetailsCached
    );
    const formatted = formatPlaceList(
      sampledPlaces,
      sampledPlaces.length,
      true
    );
    if (!formatted.includes("(none found)")) {
      delta[category] = formatted;
    }
  }

  if (categoriesFetched.length > 0) {
    logger.info(
      {
        zipCode,
        audienceSegment,
        categoriesFromCache,
        categoriesFetched,
        searchCallsEstimated,
        fallbackSearchCallsEstimated,
        detailsCallsEstimated,
        totalCallsEstimated: searchCallsEstimated + detailsCallsEstimated,
        costEstimateUsd: estimateGoogleCallsCostUsd(
          searchCallsEstimated + detailsCallsEstimated
        ),
        seasonalCategories
      },
      "Community audience refresh estimated Google calls"
    );
  }

  return delta;
}
