import type { CommunityData } from "@web/src/types/market";
import { fetchCityDescription } from "../../../shared/cityDescription";
import { buildAudienceAugmentDelta } from "../core/audience";
import {
  applyAudienceDelta,
  getAudienceSkipCategories,
  trimCommunityDataLists
} from "../core/communityLists";
import { normalizeAudienceSegment } from "../../../shared/audience";
import { SEARCH_ANCHOR_OFFSETS } from "@web/src/server/services/community/config";
import { getCommunityDataByZip } from "./service";
import {
  buildGeoRuntimeContext,
  communityCache,
  getPlaceDetailsCached,
  getQueryOverrides,
  logger,
  resolveLocationOrWarn
} from "./shared";

export async function getCommunityDataByZipAndAudience(
  zipCode: string,
  audienceSegment?: string,
  serviceAreas?: string[] | null,
  preferredCity?: string | null,
  preferredState?: string | null
): Promise<CommunityData | null> {
  const normalized = normalizeAudienceSegment(audienceSegment);
  if (!normalized) {
    return getCommunityDataByZip(
      zipCode,
      serviceAreas,
      preferredCity,
      preferredState
    );
  }

  const cachedDelta = await communityCache.getCachedAudienceDelta(
    zipCode,
    normalized,
    serviceAreas,
    preferredCity,
    preferredState
  );
  let delta = cachedDelta;
  if (!delta) {
    const location = await resolveLocationOrWarn(
      zipCode,
      preferredCity,
      preferredState
    );
    if (location) {
      const { distanceCache, serviceAreaCache } = await buildGeoRuntimeContext(
        zipCode,
        location,
        serviceAreas
      );
      delta = await buildAudienceAugmentDelta({
        location,
        audienceSegment: normalized,
        distanceCache,
        serviceAreaCache,
        serviceAreas,
        zipCode,
        preferredCity,
        preferredState,
        communityCache,
        logger,
        anchorOffsets: SEARCH_ANCHOR_OFFSETS,
        getPlaceDetailsCached,
        getQueryOverrides
      });
      if (delta && Object.keys(delta).length > 0) {
        await communityCache.setCachedAudienceDelta(
          zipCode,
          normalized,
          delta,
          serviceAreas,
          preferredCity,
          preferredState
        );
      }
    }
  }

  const skipCategories = getAudienceSkipCategories(delta);
  const base = await getCommunityDataByZip(
    zipCode,
    serviceAreas,
    preferredCity,
    preferredState,
    {
      skipCategories,
      writeCache: skipCategories.size === 0
    }
  );
  if (!base) {
    return null;
  }

  const merged = delta ? applyAudienceDelta(base, delta) : base;
  return buildAudienceCommunityData(trimCommunityDataLists(merged), normalized);
}

export async function getCityDescription(
  city?: string | null,
  state?: string | null
): Promise<string | null> {
  if (!city || !state) {
    return null;
  }

  const cached = await communityCache.getCachedCityDescription(city, state);
  if (cached) {
    return cached.description;
  }

  const description = await fetchCityDescription(city, state, logger);
  if (description) {
    await communityCache.setCachedCityDescription(city, state, description);
    return description.description;
  }

  return null;
}

export function buildAudienceCommunityData(
  communityData: CommunityData,
  audienceSegment?: string
): CommunityData {
  const normalizedSegment = normalizeAudienceSegment(audienceSegment);
  let neighborhoodsDetail = communityData.neighborhoods_list;
  switch (normalizedSegment) {
    case "growing_families":
      neighborhoodsDetail = communityData.neighborhoods_family_list;
      break;
    case "luxury_homebuyers":
      neighborhoodsDetail = communityData.neighborhoods_luxury_list;
      break;
    case "downsizers_retirees":
      neighborhoodsDetail = communityData.neighborhoods_senior_list;
      break;
    case "investors_relocators":
      neighborhoodsDetail = communityData.neighborhoods_relocators_list;
      break;
    default:
      neighborhoodsDetail = communityData.neighborhoods_list;
  }
  return {
    ...communityData,
    neighborhoods_list: neighborhoodsDetail
  };
}
