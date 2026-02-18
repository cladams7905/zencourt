import type { CommunityData } from "@web/src/types/market";
import {
  CommunityDataProvider,
  getCommunityDataProvider,
  type CategoryKey
} from "@web/src/server/services/community/config";
import { normalizeAudienceSegment } from "./shared/audience";
import {
  getPerplexityCommunityData,
  getPerplexityCommunityDataByZipAndAudienceForCategories,
  getPerplexityMonthlyEventsSectionByZip,
  prefetchPerplexityCategoriesByZip
} from "./providers/perplexity";
import {
  buildAudienceCommunityData,
  getCityDescription,
  getCommunityDataByZip as getGoogleCommunityDataByZip,
  getCommunityDataByZipAndAudience as getGoogleCommunityDataByZipAndAudience,
  resolveLocationOrWarn,
  toOriginLocationInput
} from "./providers/google";

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

  if (getCommunityDataProvider() === CommunityDataProvider.Google) {
    return getGoogleCommunityDataByZip(
      zipCode,
      serviceAreas,
      preferredCity,
      preferredState,
      options
    );
  }

  const location = await resolveLocationOrWarn(
    zipCode,
    preferredCity,
    preferredState
  );
  if (!location) {
    return null;
  }

  try {
    const perplexityData = await getPerplexityCommunityData({
      zipCode,
      location: toOriginLocationInput(location),
      serviceAreas
    });

    if (perplexityData) {
      return perplexityData;
    }
  } catch {
    // Fallback to Google when Perplexity request path fails.
  }

  return getGoogleCommunityDataByZip(
    zipCode,
    serviceAreas,
    preferredCity,
    preferredState,
    options
  );
}

export async function getCommunityDataByZipAndAudience(
  zipCode: string,
  audienceSegment?: string,
  serviceAreas?: string[] | null,
  preferredCity?: string | null,
  preferredState?: string | null
): Promise<CommunityData | null> {
  if (!zipCode) {
    return null;
  }

  if (getCommunityDataProvider() === CommunityDataProvider.Google) {
    return getGoogleCommunityDataByZipAndAudience(
      zipCode,
      audienceSegment,
      serviceAreas,
      preferredCity,
      preferredState
    );
  }

  const normalized = normalizeAudienceSegment(audienceSegment);
  const location = await resolveLocationOrWarn(
    zipCode,
    preferredCity,
    preferredState,
    normalized ? { audience: normalized } : undefined
  );
  if (!location) {
    return null;
  }

  try {
    const perplexityData = await getPerplexityCommunityData({
      zipCode,
      location: toOriginLocationInput(location),
      audience: normalized,
      serviceAreas
    });

    if (perplexityData) {
      return perplexityData;
    }
  } catch {
    // Fallback to Google when Perplexity request path fails.
  }

  return getGoogleCommunityDataByZipAndAudience(
    zipCode,
    audienceSegment,
    serviceAreas,
    preferredCity,
    preferredState
  );
}

export {
  buildAudienceCommunityData,
  getCityDescription,
  getPerplexityCommunityDataByZipAndAudienceForCategories,
  getPerplexityMonthlyEventsSectionByZip,
  prefetchPerplexityCategoriesByZip
};
