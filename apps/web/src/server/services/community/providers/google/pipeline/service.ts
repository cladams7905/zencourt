import type { CommunityData } from "@web/src/types/market";
import {
  buildBaseCategoryFieldValues,
  buildCategoryQueryPlan,
  getBaseDetailCallsForCategories
} from "../core/base";
import { getSearchAnchors } from "../core/search";
import {
  estimateSearchCallsForQueries,
  pickSeasonalCategories
} from "../core/seasonal";
import { getUtcMonthKey as getSharedUtcMonthKey } from "../../../shared/common";
import { estimateGoogleCallsCostUsd } from "../../../shared/apiCost";
import {
  SEARCH_ANCHOR_OFFSETS,
  CATEGORY_CONFIG,
  type CategoryKey
} from "@web/src/server/services/community/config";
import {
  buildGeoRuntimeContext,
  communityCache,
  logger,
  resolveLocationOrWarn
} from "./shared";
import { loadBaseCachePlan } from "./workflows/planning";
import { fetchGroupedPlaces } from "./workflows/fetching";
import {
  buildAndPersistCategoryListMap,
  getAndPersistNeighborhoodLists,
  getOrBuildSeasonalSections
} from "./workflows/assembly";

export async function getCommunityDataByZip(
  zipCode: string,
  serviceAreas?: string[] | null,
  preferredCity?: string | null,
  preferredState?: string | null,
  options?: {
    skipCategories?: Set<CategoryKey>;
    writeCache?: boolean;
  }
): Promise<CommunityData | null> {
  if (!zipCode) {
    return null;
  }

  const cached = await communityCache.getCachedCommunityData(
    zipCode,
    preferredCity,
    preferredState
  );
  if (cached) {
    return cached;
  }

  const skipCategories = options?.skipCategories ?? new Set<CategoryKey>();
  const location = await resolveLocationOrWarn(
    zipCode,
    preferredCity,
    preferredState
  );
  if (!location) {
    return null;
  }
  const { distanceCache, serviceAreaCache } = await buildGeoRuntimeContext(
    zipCode,
    location,
    serviceAreas
  );

  const seasonalCategoryPool = Object.keys(CATEGORY_CONFIG).filter(
    (key) => key !== "neighborhoods"
  ) as CategoryKey[];
  const allowedSeasonalCategories = new Set(
    pickSeasonalCategories(
      `${zipCode}:${getSharedUtcMonthKey()}:base`,
      seasonalCategoryPool,
      4
    )
  );
  const usedSeasonalHeaders = new Set<string>();
  logger.info(
    {
      zipCode,
      month: getSharedUtcMonthKey(),
      seasonalCategories: Array.from(allowedSeasonalCategories)
    },
    "Selected seasonal categories for base refresh"
  );

  const {
    cachedCategoryLists,
    categoriesToFetch,
    cachedNeighborhoodLists,
    neighborhoodsToFetch
  } = await loadBaseCachePlan({
    zipCode,
    preferredCity,
    preferredState,
    skipCategories
  });

  const categoryQueries = buildCategoryQueryPlan({
    location,
    zipCode,
    categoriesToFetch,
    allowedSeasonalCategories,
    usedSeasonalHeaders,
    logger
  });

  const baseDidRefresh =
    categoriesToFetch.size > 0 || neighborhoodsToFetch.length > 0;
  if (baseDidRefresh) {
    logger.info(
      {
        zipCode,
        categoriesFromCache: Array.from(cachedCategoryLists.keys()),
        categoriesFetched: Array.from(categoriesToFetch),
        skipCategories: Array.from(skipCategories)
      },
      "Community base categories cache vs fetch"
    );
  }

  const searchAnchorCount = getSearchAnchors(
    location,
    SEARCH_ANCHOR_OFFSETS
  ).length;
  const neighborhoodSearchCalls =
    neighborhoodsToFetch.length * searchAnchorCount;
  const categorySearchCalls = categoryQueries.reduce((total, category) => {
    return (
      total +
      estimateSearchCallsForQueries(
        category.key as CategoryKey,
        category.queries,
        category.seasonalQueries,
        searchAnchorCount
      )
    );
  }, 0);
  const baseDetailCalls = getBaseDetailCallsForCategories(categoriesToFetch);

  const baseTotalCalls =
    neighborhoodSearchCalls + categorySearchCalls + baseDetailCalls;
  const baseCostEstimate = estimateGoogleCallsCostUsd(baseTotalCalls);

  if (baseDidRefresh) {
    logger.info(
      {
        zipCode,
        searchCallsEstimated: neighborhoodSearchCalls + categorySearchCalls,
        detailsCallsEstimated: baseDetailCalls,
        totalCallsEstimated: baseTotalCalls,
        costEstimateUsd: baseCostEstimate,
        seasonalCategories: Array.from(allowedSeasonalCategories)
      },
      "Community base refresh estimated Google calls"
    );
  }

  const { grouped, alreadyHydratedCategories } = await fetchGroupedPlaces({
    zipCode,
    serviceAreas,
    preferredCity,
    preferredState,
    location,
    distanceCache,
    serviceAreaCache,
    categoryQueries,
    neighborhoodsToFetch
  });

  const listMap = await buildAndPersistCategoryListMap({
    zipCode,
    preferredCity,
    preferredState,
    grouped,
    alreadyHydratedCategories,
    categoriesToFetch,
    cachedCategoryLists
  });

  const seasonalGeoSections = await getOrBuildSeasonalSections({
    zipCode,
    preferredCity,
    preferredState,
    grouped
  });

  const { neighborhoodsGeneral, neighborhoodsFamily, neighborhoodsSenior } =
    await getAndPersistNeighborhoodLists({
      zipCode,
      preferredCity,
      preferredState,
      grouped,
      cachedNeighborhoodLists
    });

  const neighborhoodsLuxury = neighborhoodsFamily;
  const neighborhoodsRelocators = neighborhoodsGeneral;
  const categoryFieldValues = buildBaseCategoryFieldValues({
    skipCategories,
    listMap
  });
  const baseCommunityData: CommunityData = {
    city: location.city,
    state: location.state_id,
    zip_code: zipCode,
    data_timestamp: new Date().toISOString(),
    neighborhoods_list: neighborhoodsGeneral,
    neighborhoods_family_list: neighborhoodsFamily,
    neighborhoods_luxury_list: neighborhoodsLuxury,
    neighborhoods_senior_list: neighborhoodsSenior,
    neighborhoods_relocators_list: neighborhoodsRelocators,
    ...categoryFieldValues,
    seasonal_geo_sections: seasonalGeoSections
  };

  if (options?.writeCache ?? true) {
    await communityCache.setCachedCommunityData(
      zipCode,
      baseCommunityData,
      preferredCity,
      preferredState
    );
  }
  return baseCommunityData;
}
