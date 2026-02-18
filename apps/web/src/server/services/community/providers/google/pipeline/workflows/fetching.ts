import {
  fetchPlacesWithAnchors,
  fetchScoredPlacesForQueries,
  toScoredPlaces
} from "../../core/search";
import { getPooledCategoryPlaces } from "../../core/pools";
import type { ScoredPlace } from "../../core/places";
import { hydratePlacesFromItems } from "../../core/places/details";
import { SEARCH_ANCHOR_OFFSETS, type CategoryKey, NEIGHBORHOOD_QUERIES } from "@web/src/server/services/community/config";
import {
  communityCache,
  getPlaceDetailsCached,
  getQueryOverrides,
  logger
} from "../shared";
import type { DistanceCache, ServiceAreaDistanceCache } from "../../core/geo";

export async function fetchGroupedPlaces(params: {
  zipCode: string;
  serviceAreas?: string[] | null;
  preferredCity?: string | null;
  preferredState?: string | null;
  location: {
    city: string;
    state_id: string;
    lat: number;
    lng: number;
  };
  distanceCache: DistanceCache;
  serviceAreaCache: ServiceAreaDistanceCache | null;
  categoryQueries: Array<{
    key: string;
    queries: string[];
    seasonalQueries: Set<string>;
    max: number;
  }>;
  neighborhoodsToFetch: typeof NEIGHBORHOOD_QUERIES;
}) {
  const {
    zipCode,
    serviceAreas,
    preferredCity,
    preferredState,
    location,
    distanceCache,
    serviceAreaCache,
    categoryQueries,
    neighborhoodsToFetch
  } = params;

  const makeFetchFn = (category: {
    key: string;
    queries: string[];
    seasonalQueries: Set<string>;
    max: number;
  }) => async (): Promise<ScoredPlace[]> =>
    fetchScoredPlacesForQueries({
      queries: category.queries,
      category: category.key,
      maxResults: category.max,
      location,
      distanceCache,
      anchorOffsets: SEARCH_ANCHOR_OFFSETS,
      serviceAreaCache,
      seasonalQueries: category.seasonalQueries,
      overridesForQuery: (query) => getQueryOverrides(category.key, query)
    });

  const categoryResults = await Promise.all(
    categoryQueries.map(async (category) => {
      const sampledItems = await getPooledCategoryPlaces(
        communityCache,
        logger,
        {
          zipCode,
          category: category.key,
          serviceAreas,
          city: preferredCity,
          state: preferredState
        },
        makeFetchFn(category)
      );
      const sampledPlaces = await hydratePlacesFromItems(
        sampledItems,
        category.key,
        getPlaceDetailsCached
      );
      return { key: category.key, places: sampledPlaces };
    })
  );

  const neighborhoodResults = await Promise.all(
    neighborhoodsToFetch.map(async (category) => {
      const places = await fetchPlacesWithAnchors(
        category.query,
        location,
        category.max,
        SEARCH_ANCHOR_OFFSETS,
        category.key as CategoryKey
      );
      return {
        key: category.key,
        places: toScoredPlaces(
          places,
          category.key,
          distanceCache,
          serviceAreaCache,
          undefined,
          undefined
        )
      };
    })
  );

  const grouped: Record<string, ScoredPlace[]> = {};
  for (const result of [...categoryResults, ...neighborhoodResults]) {
    grouped[result.key] = result.places;
  }

  return {
    grouped,
    alreadyHydratedCategories: new Set(categoryResults.map((r) => r.key))
  };
}
