import { COMMUNITY_CACHE_KEY_PREFIX } from "@web/src/server/services/community/config";
import {
  buildServiceAreasSignature,
  getSecondsUntilEndOfMonth,
  slugify
} from "../../../shared/common";

export const COMMUNITY_AUDIENCE_DELTA_TTL_SECONDS = 60 * 60 * 12;
export const PLACE_DETAILS_CACHE_TTL_SECONDS = 60 * 60 * 12;

export function getCommunityCacheKey(
  zipCode: string,
  city?: string | null,
  state?: string | null
): string {
  if (city && state) {
    return `${COMMUNITY_CACHE_KEY_PREFIX}:${zipCode}:${state.toUpperCase()}:${slugify(city)}`;
  }
  return `${COMMUNITY_CACHE_KEY_PREFIX}:${zipCode}`;
}

export function getCommunityAudienceCacheKey(
  zipCode: string,
  audienceSegment: string,
  serviceAreas?: string[] | null,
  city?: string | null,
  state?: string | null
): string {
  const signature = buildServiceAreasSignature(serviceAreas);
  const base = `${getCommunityCacheKey(zipCode, city, state)}:aud:${audienceSegment}`;
  return signature ? `${base}:sa:${signature}` : base;
}

export function getCommunityCategoryCacheKey(
  zipCode: string,
  category: string,
  city?: string | null,
  state?: string | null
): string {
  const base = getCommunityCacheKey(zipCode, city, state);
  return `${base}:cat:${category}`;
}

export function getCommunitySeasonalCacheKey(
  zipCode: string,
  city?: string | null,
  state?: string | null
): string {
  return `${getCommunityCacheKey(zipCode, city, state)}:seasonal`;
}

export function getPlaceDetailsCacheKey(placeId: string): string {
  return `${COMMUNITY_CACHE_KEY_PREFIX}:place:${placeId}`;
}

export function getCityDescriptionCacheKey(city: string, state: string): string {
  return `${COMMUNITY_CACHE_KEY_PREFIX}:citydesc:${state.toUpperCase()}:${slugify(city)}`;
}

export function getPlacePoolCacheKey(
  zipCode: string,
  category: string,
  audience?: string | null,
  serviceAreas?: string[] | null,
  city?: string | null,
  state?: string | null
): string {
  const base =
    city && state
      ? `${COMMUNITY_CACHE_KEY_PREFIX}:pool:${zipCode}:${state.toUpperCase()}:${slugify(city)}:${category}`
      : `${COMMUNITY_CACHE_KEY_PREFIX}:pool:${zipCode}:${category}`;
  const withAudience = audience ? `${base}:${audience}` : base;
  const signature = buildServiceAreasSignature(serviceAreas);
  return signature ? `${withAudience}:sa:${signature}` : withAudience;
}

export function getCommunityCacheTtlSeconds(): number {
  return getSecondsUntilEndOfMonth();
}

export function isPoolStale(fetchedAt?: string): boolean {
  if (!fetchedAt) {
    return true;
  }

  const fetchedDate = new Date(fetchedAt);
  if (Number.isNaN(fetchedDate.getTime())) {
    return true;
  }

  const now = new Date();
  return (
    fetchedDate.getUTCFullYear() !== now.getUTCFullYear() ||
    fetchedDate.getUTCMonth() !== now.getUTCMonth()
  );
}
