import type { CommunityData } from "@web/src/types/market";
import type { ScoredPlace } from "../../core/places";
import {
  buildNeighborhoodDetailList,
  formatPlaceList
} from "../../core/places";
import {
  buildCategoryListWithDetails
} from "../../core/places/details";
import {
  buildSeasonalQuerySections,
  CATEGORY_FIELD_MAP,
  NON_NEIGHBORHOOD_CATEGORY_KEYS
} from "../../core/seasonal";
import {
  getCategoryDisplayLimit,
  type CategoryKey
} from "@web/src/server/services/community/config";
import {
  communityCache,
  getPlaceDetailsCached
} from "../shared";

export async function buildAndPersistCategoryListMap(params: {
  zipCode: string;
  preferredCity?: string | null;
  preferredState?: string | null;
  grouped: Record<string, ScoredPlace[]>;
  alreadyHydratedCategories: Set<string>;
  categoriesToFetch: Set<CategoryKey>;
  cachedCategoryLists: Map<CategoryKey, string>;
}) {
  const {
    zipCode,
    preferredCity,
    preferredState,
    grouped,
    alreadyHydratedCategories,
    categoriesToFetch,
    cachedCategoryLists
  } = params;

  const listConfigs: Array<{ category: CategoryKey; max: number }> = NON_NEIGHBORHOOD_CATEGORY_KEYS
    .filter((category) => categoriesToFetch.has(category))
    .map((category) => ({
      category,
      max: getCategoryDisplayLimit(category)
    }));

  const listResults = await Promise.all(
    listConfigs.map(async ({ category, max }) => {
      const places = grouped[category] ?? [];
      if (alreadyHydratedCategories.has(category)) {
        return { category, value: formatPlaceList(places, max, true) };
      }
      return {
        category,
        value: await buildCategoryListWithDetails(
          category,
          places,
          max,
          getPlaceDetailsCached
        )
      };
    })
  );

  const listMap = new Map<keyof CommunityData, string>();
  for (const [category, value] of cachedCategoryLists.entries()) {
    listMap.set(CATEGORY_FIELD_MAP[category], value);
  }
  for (const { category, value } of listResults) {
    const key = CATEGORY_FIELD_MAP[category];
    if (value && !value.includes("(none found)")) {
      listMap.set(key, value);
      await communityCache.setCachedCommunityCategoryList(
        zipCode,
        category,
        value,
        preferredCity,
        preferredState
      );
    }
  }
  return listMap;
}

export async function getOrBuildSeasonalSections(params: {
  zipCode: string;
  preferredCity?: string | null;
  preferredState?: string | null;
  grouped: Record<string, ScoredPlace[]>;
}) {
  const { zipCode, preferredCity, preferredState, grouped } = params;
  let seasonalGeoSections =
    (await communityCache.getCachedSeasonalSections(
      zipCode,
      preferredCity,
      preferredState
    )) ?? null;
  if (!seasonalGeoSections) {
    seasonalGeoSections = buildSeasonalQuerySections(grouped, 3, 3);
    if (Object.keys(seasonalGeoSections).length > 0) {
      await communityCache.setCachedSeasonalSections(
        zipCode,
        seasonalGeoSections,
        preferredCity,
        preferredState
      );
    }
  }
  return seasonalGeoSections ?? {};
}

export async function getAndPersistNeighborhoodLists(params: {
  zipCode: string;
  preferredCity?: string | null;
  preferredState?: string | null;
  grouped: Record<string, ScoredPlace[]>;
  cachedNeighborhoodLists: Map<string, string>;
}) {
  const { zipCode, preferredCity, preferredState, grouped, cachedNeighborhoodLists } = params;

  const neighborhoodsGeneral =
    cachedNeighborhoodLists.get("neighborhoods_general") ??
    buildNeighborhoodDetailList(grouped.neighborhoods_general ?? []);
  const neighborhoodsFamily =
    cachedNeighborhoodLists.get("neighborhoods_family") ??
    buildNeighborhoodDetailList(grouped.neighborhoods_family ?? []);
  const neighborhoodsSenior =
    cachedNeighborhoodLists.get("neighborhoods_senior") ??
    buildNeighborhoodDetailList(grouped.neighborhoods_senior ?? []);

  if (neighborhoodsGeneral && !neighborhoodsGeneral.includes("(none found)")) {
    await communityCache.setCachedCommunityCategoryList(
      zipCode,
      "neighborhoods_general",
      neighborhoodsGeneral,
      preferredCity,
      preferredState
    );
  }
  if (neighborhoodsFamily && !neighborhoodsFamily.includes("(none found)")) {
    await communityCache.setCachedCommunityCategoryList(
      zipCode,
      "neighborhoods_family",
      neighborhoodsFamily,
      preferredCity,
      preferredState
    );
  }
  if (neighborhoodsSenior && !neighborhoodsSenior.includes("(none found)")) {
    await communityCache.setCachedCommunityCategoryList(
      zipCode,
      "neighborhoods_senior",
      neighborhoodsSenior,
      preferredCity,
      preferredState
    );
  }

  return { neighborhoodsGeneral, neighborhoodsFamily, neighborhoodsSenior };
}
