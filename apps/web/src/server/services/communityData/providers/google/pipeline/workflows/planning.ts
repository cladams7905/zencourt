import { countListItems } from "../../core/places";
import { NON_NEIGHBORHOOD_CATEGORY_KEYS } from "../../core/seasonal";
import {
  NEIGHBORHOOD_QUERIES,
  type CategoryKey
} from "@web/src/server/services/communityData/config";
import { communityCache } from "../shared";

export async function loadBaseCachePlan(params: {
  zipCode: string;
  preferredCity?: string | null;
  preferredState?: string | null;
  skipCategories: Set<CategoryKey>;
}) {
  const { zipCode, preferredCity, preferredState, skipCategories } = params;
  const cachedCategoryLists = new Map<CategoryKey, string>();
  const categoriesToFetch = new Set<CategoryKey>();
  const cachedNeighborhoodLists = new Map<string, string>();
  const neighborhoodsToFetch: typeof NEIGHBORHOOD_QUERIES = [];

  await Promise.all(
    NON_NEIGHBORHOOD_CATEGORY_KEYS.filter(
      (category) => !skipCategories.has(category)
    ).map(async (category) => {
      const cachedList = await communityCache.getCachedCommunityCategoryList(
        zipCode,
        category,
        preferredCity,
        preferredState
      );
      if (cachedList && countListItems(cachedList) > 0) {
        cachedCategoryLists.set(category, cachedList);
      } else {
        categoriesToFetch.add(category);
      }
    })
  );

  await Promise.all(
    NEIGHBORHOOD_QUERIES.map(async (category) => {
      const cachedList = await communityCache.getCachedCommunityCategoryList(
        zipCode,
        category.key,
        preferredCity,
        preferredState
      );
      if (cachedList && countListItems(cachedList) > 0) {
        cachedNeighborhoodLists.set(category.key, cachedList);
      } else {
        neighborhoodsToFetch.push(category);
      }
    })
  );

  return {
    cachedCategoryLists,
    categoriesToFetch,
    cachedNeighborhoodLists,
    neighborhoodsToFetch
  };
}
