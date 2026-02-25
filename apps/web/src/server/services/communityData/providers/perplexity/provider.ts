import {
  CommunityDataProvider,
  shouldIncludeServiceAreasInCache,
  type CategoryKey
} from "@web/src/server/services/communityData/config";
import { normalizeAudienceSegment } from "@web/src/server/services/communityData/shared/audience";
import {
  getPerplexityCommunityData,
  getPerplexityCommunityDataByZipAndAudienceForCategories,
  getPerplexityMonthlyEventsSectionByZip,
  prefetchPerplexityCategoriesByZip
} from "./pipeline";
import { getCachedPerplexityCategoryPayload } from "./cache";
import type { CommunityDataProviderStrategy } from "../types";
import { resolveLocationOrWarn, toOriginLocationInput } from "../google";

export function createPerplexityCommunityDataProvider(): CommunityDataProviderStrategy {
  return {
    provider: CommunityDataProvider.Perplexity,
    async getCommunityDataByZip(params) {
      const location = await resolveLocationOrWarn(
        params.zipCode,
        params.preferredCity,
        params.preferredState
      );
      if (!location) {
        return undefined;
      }

      return getPerplexityCommunityData({
        zipCode: params.zipCode,
        location: toOriginLocationInput(location),
        serviceAreas: params.serviceAreas
      });
    },
    async getCommunityDataByZipAndAudience(params) {
      const normalized = normalizeAudienceSegment(params.audienceSegment);
      const location = await resolveLocationOrWarn(
        params.zipCode,
        params.preferredCity,
        params.preferredState,
        normalized ? { audience: normalized } : undefined
      );
      if (!location) {
        return undefined;
      }

      return getPerplexityCommunityData({
        zipCode: params.zipCode,
        location: toOriginLocationInput(location),
        audience: normalized,
        serviceAreas: params.serviceAreas
      });
    },
    async getMonthlyEventsSectionByZip(params) {
      return getPerplexityMonthlyEventsSectionByZip(
        params.zipCode,
        params.audienceSegment,
        params.preferredCity,
        params.preferredState
      );
    },
    async getCommunityDataByZipAndAudienceForCategories(params) {
      return getPerplexityCommunityDataByZipAndAudienceForCategories(
        params.zipCode,
        params.categories,
        params.audienceSegment,
        params.serviceAreas,
        params.preferredCity,
        params.preferredState,
        params.eventsSection,
        params.options
      );
    },
    async getAvoidRecommendationsForCategories(params) {
      const avoidMap = new Map<CategoryKey, string[]>();
      const normalizedAudience = normalizeAudienceSegment(params.audienceSegment);
      await Promise.all(
        params.categories.map(async (category) => {
          const cached = await getCachedPerplexityCategoryPayload({
            zipCode: params.zipCode,
            category,
            audience: normalizedAudience,
            serviceAreas: shouldIncludeServiceAreasInCache(category)
              ? params.serviceAreas
              : null,
            city: params.preferredCity ?? undefined,
            state: params.preferredState ?? undefined
          });
          const names = (cached?.items ?? [])
            .map((item) => item.name?.trim())
            .filter((name): name is string => Boolean(name));
          if (names.length > 0) {
            avoidMap.set(category, Array.from(new Set(names)));
          }
        })
      );

      return Object.fromEntries(avoidMap);
    },
    async prefetchCategoriesByZip(params) {
      await prefetchPerplexityCategoriesByZip(
        params.zipCode,
        params.categories,
        params.audienceSegment,
        params.serviceAreas,
        params.preferredCity,
        params.preferredState
      );
    }
  };
}

