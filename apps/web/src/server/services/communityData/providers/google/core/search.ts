import { fetchPlaces, type PlaceResult } from "../transport/client";
import {
  CHAIN_FILTER_CATEGORIES,
  CHAIN_NAME_BLACKLIST,
  DEFAULT_SEARCH_RADIUS_METERS,
  MAX_PLACE_DISTANCE_KM,
  NEIGHBORHOOD_REJECT_TERMS,
  getCategoryMinRating,
  getCategoryMinReviews,
  type CategoryKey
} from "@web/src/server/services/communityData/config";
import { LOW_PRIORITY_ANCHOR_CATEGORIES, normalizeQueryKey } from "./seasonal";
import type {
  CityRecord,
  DistanceCache,
  ServiceAreaDistanceCache
} from "./geo";
import type { ScoredPlace } from "./places";

export type QueryOverrides = {
  minRating?: number;
  minReviews?: number;
};

export type SearchAnchor = {
  lat: number;
  lng: number;
};

export function getSearchAnchors(
  location: CityRecord,
  anchorOffsets: SearchAnchor[]
): SearchAnchor[] {
  const anchors = anchorOffsets.map((offset) => ({
    lat: location.lat + offset.lat,
    lng: location.lng + offset.lng
  }));
  const seen = new Set<string>();
  const unique: SearchAnchor[] = [];
  for (const anchor of anchors) {
    const key = `${anchor.lat.toFixed(4)}:${anchor.lng.toFixed(4)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(anchor);
  }
  return unique.length > 0
    ? unique
    : [{ lat: location.lat, lng: location.lng }];
}

export async function fetchPlacesWithAnchors(
  query: string,
  location: CityRecord,
  maxResults: number,
  anchorOffsets: SearchAnchor[],
  category?: CategoryKey,
  forceSingleAnchor?: boolean
): Promise<PlaceResult[]> {
  const anchors =
    forceSingleAnchor ||
    (category && LOW_PRIORITY_ANCHOR_CATEGORIES.has(category))
      ? [{ lat: location.lat, lng: location.lng }]
      : getSearchAnchors(location, anchorOffsets);
  const perAnchorMax = Math.max(3, Math.ceil(maxResults / anchors.length));
  const results = await Promise.all(
    anchors.map((anchor) =>
      fetchPlaces(query, anchor, perAnchorMax, DEFAULT_SEARCH_RADIUS_METERS)
    )
  );
  return results.flat();
}

function isChainPlace(name: string, category: string): boolean {
  if (category.startsWith("neighborhoods_")) {
    return false;
  }
  if (
    !CHAIN_FILTER_CATEGORIES.includes(
      category as (typeof CHAIN_FILTER_CATEGORIES)[number]
    )
  ) {
    return false;
  }
  const normalized = name.toLowerCase();
  return CHAIN_NAME_BLACKLIST.some((term) => normalized.includes(term));
}

function extractDisplayName(place: PlaceResult): string {
  return place.displayName?.text?.trim() || "";
}

function getPrimaryDistanceKm(
  place: PlaceResult,
  distanceCache: DistanceCache
): number | null {
  const latitude = place.location?.latitude;
  const longitude = place.location?.longitude;
  if (latitude === undefined || longitude === undefined) {
    return null;
  }
  return distanceCache.getDistanceKm(latitude, longitude);
}

function getServiceAreaDistanceKm(
  place: PlaceResult,
  serviceAreaCache?: ServiceAreaDistanceCache | null
): number | null {
  const latitude = place.location?.latitude;
  const longitude = place.location?.longitude;
  if (!serviceAreaCache || latitude === undefined || longitude === undefined) {
    return null;
  }
  return serviceAreaCache.getDistanceKm(latitude, longitude);
}

export function toScoredPlaces(
  places: PlaceResult[] | undefined,
  category: string,
  distanceCache: DistanceCache,
  serviceAreaCache?: ServiceAreaDistanceCache | null,
  overrides?: QueryOverrides | null,
  sourceQuery?: string
): ScoredPlace[] {
  if (!places || places.length === 0) {
    return [];
  }

  return places
    .filter((place) => {
      const distance = getPrimaryDistanceKm(place, distanceCache);
      return distance === null || distance <= MAX_PLACE_DISTANCE_KM;
    })
    .filter((place) => {
      if (category.startsWith("neighborhoods_")) {
        const name = (place.displayName?.text || "").toLowerCase();
        if (NEIGHBORHOOD_REJECT_TERMS.some((term) => name.includes(term))) {
          return false;
        }
        return true;
      }
      if (isChainPlace(place.displayName?.text || "", category)) {
        return false;
      }
      const minRating = overrides?.minRating ?? getCategoryMinRating(category);
      const minReviews =
        overrides?.minReviews ?? getCategoryMinReviews(category);
      if (minRating > 0 && (place.rating ?? 0) < minRating) {
        return false;
      }
      if (minReviews > 0 && (place.userRatingCount ?? 0) < minReviews) {
        return false;
      }
      return true;
    })
    .map((place) => ({
      name: extractDisplayName(place),
      rating: place.rating ?? 0,
      reviewCount: place.userRatingCount ?? 0,
      address: place.formattedAddress ?? "",
      category,
      placeId: place.id,
      sourceQueries: sourceQuery ? [sourceQuery] : undefined,
      distanceKm: (() => {
        const primaryDistance = getPrimaryDistanceKm(place, distanceCache);
        const serviceDistance = getServiceAreaDistanceKm(
          place,
          serviceAreaCache
        );
        if (serviceDistance !== null) {
          return Math.min(serviceDistance, primaryDistance ?? serviceDistance);
        }
        return primaryDistance ?? undefined;
      })()
    }))
    .filter((place) => place.name);
}

export async function fetchScoredPlacesForQueries(params: {
  queries: string[];
  category: string;
  maxResults: number;
  location: CityRecord;
  distanceCache: DistanceCache;
  anchorOffsets: SearchAnchor[];
  serviceAreaCache?: ServiceAreaDistanceCache | null;
  seasonalQueries: Set<string>;
  overridesForQuery?: (query: string) => QueryOverrides | null | undefined;
}): Promise<ScoredPlace[]> {
  const {
    queries,
    category,
    maxResults,
    location,
    distanceCache,
    anchorOffsets,
    serviceAreaCache,
    seasonalQueries,
    overridesForQuery
  } = params;
  if (!queries || queries.length === 0) {
    return [];
  }
  const scored = await Promise.all(
    queries.map(async (query) => {
      const sourceQuery = seasonalQueries.has(normalizeQueryKey(query))
        ? query
        : undefined;
      const results = await fetchPlacesWithAnchors(
        query,
        location,
        maxResults,
        anchorOffsets,
        category as CategoryKey,
        Boolean(sourceQuery)
      );
      return toScoredPlaces(
        results,
        category,
        distanceCache,
        serviceAreaCache,
        overridesForQuery ? (overridesForQuery(query) ?? undefined) : undefined,
        sourceQuery
      );
    })
  );
  return scored.flat();
}
