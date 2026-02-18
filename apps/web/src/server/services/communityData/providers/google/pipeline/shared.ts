import { createChildLogger, logger as baseLogger } from "@web/src/lib/core/logging/logger";
import {
  fetchPlaceDetails,
  PlaceDetailsResponse
} from "../transport/client";
import {
  createCommunityCache
} from "../cache";
import {
  DistanceCache,
  ServiceAreaDistanceCache,
  type CityRecord,
  loadCityDataset,
  resolveServiceAreaCenters,
  resolveZipLocation
} from "../core/geo";
import type { QueryOverrides } from "../core/search";

export const logger = createChildLogger(baseLogger, {
  module: "community-data-service"
});

export const communityCache = createCommunityCache(logger);

export type OriginLocation = {
  city: string;
  state: string;
  lat: number;
  lng: number;
};

export function getQueryOverrides(
  category: string,
  query: string
): QueryOverrides | null {
  if (category === "education" && query.toLowerCase().includes("library")) {
    return { minReviews: 10 };
  }
  return null;
}

export function toOriginLocationInput(location: {
  city: string;
  state_id: string;
  lat: number;
  lng: number;
}): OriginLocation {
  return {
    city: location.city,
    state: location.state_id,
    lat: location.lat,
    lng: location.lng
  };
}

export async function resolveLocationOrWarn(
  zipCode: string,
  preferredCity?: string | null,
  preferredState?: string | null,
  warnContext?: Record<string, unknown>
) {
  const location = await resolveZipLocation(
    zipCode,
    preferredCity,
    preferredState,
    logger
  );
  if (!location) {
    logger.warn(
      warnContext ? { zipCode, ...warnContext } : { zipCode },
      "Unable to resolve zip code to a city"
    );
    return null;
  }
  return location;
}

export async function getPlaceDetailsCached(
  placeId: string
): Promise<PlaceDetailsResponse | null> {
  const cached = await communityCache.getCachedPlaceDetails(placeId);
  if (cached) {
    return cached;
  }
  const details = await fetchPlaceDetails(placeId);
  if (details) {
    await communityCache.setCachedPlaceDetails(placeId, details);
  }
  return details ?? null;
}

export async function buildGeoRuntimeContext(
  zipCode: string,
  location: CityRecord,
  serviceAreas?: string[] | null
): Promise<{
  distanceCache: DistanceCache;
  serviceAreaCache: ServiceAreaDistanceCache | null;
}> {
  const distanceCache = new DistanceCache(location.lat, location.lng);
  const records = await loadCityDataset(logger);
  if (records.length === 0) {
    logger.warn({ zipCode }, "City dataset empty; cannot resolve neighborhoods");
  }
  const serviceAreaCenters = resolveServiceAreaCenters(serviceAreas, location, records);
  const serviceAreaCache = serviceAreaCenters
    ? new ServiceAreaDistanceCache(serviceAreaCenters)
    : null;
  return { distanceCache, serviceAreaCache };
}
