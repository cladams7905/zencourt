import type { CommunityData } from "@web/src/lib/domain/market/types";
import {
  CommunityDataProvider,
  getCommunityDataProvider,
  shouldIncludeServiceAreasInCache,
  type CategoryKey
} from "@web/src/server/services/communityData/config";
import { normalizeAudienceSegment } from "./shared/audience";
import {
  getPerplexityCommunityData,
  getPerplexityCommunityDataByZipAndAudienceForCategories,
  getPerplexityMonthlyEventsSectionByZip,
  prefetchPerplexityCategoriesByZip
} from "./providers/perplexity";
import {
  getCommunityDataByZip as getGoogleCommunityDataByZip,
  getCommunityDataByZipAndAudience as getGoogleCommunityDataByZipAndAudience,
  getCityDescription,
  resolveLocationOrWarn,
  toOriginLocationInput
} from "./providers/google";
import { getCachedPerplexityCategoryPayload } from "./providers/perplexity/cache";

type CommonParams = {
  zipCode: string;
  serviceAreas?: string[] | null;
  preferredCity?: string | null;
  preferredState?: string | null;
};

export type ByZipParams = CommonParams & {
  options?: {
    skipCategories?: Set<CategoryKey>;
    writeCache?: boolean;
  };
};

export type ByAudienceParams = CommonParams & {
  audienceSegment?: string;
};

export type ByCategoriesParams = ByAudienceParams & {
  categories: CategoryKey[];
  eventsSection?: { key: string; value: string } | null;
  options?: {
    forceRefresh?: boolean;
    avoidRecommendations?: Partial<Record<CategoryKey, string[]>> | null;
  };
};

export interface CommunityDataProviderStrategy {
  provider: CommunityDataProvider;
  getCommunityDataByZip(params: ByZipParams): Promise<CommunityData | null | undefined>;
  getCommunityDataByZipAndAudience(
    params: ByAudienceParams
  ): Promise<CommunityData | null | undefined>;
  getCityDescription?(params: {
    city?: string | null;
    state?: string | null;
  }): Promise<string | null>;
  getMonthlyEventsSectionByZip?(
    params: ByAudienceParams
  ): Promise<{ key: string; value: string } | null>;
  getCommunityDataByZipAndAudienceForCategories?(
    params: ByCategoriesParams
  ): Promise<CommunityData | null>;
  getAvoidRecommendationsForCategories?(
    params: Pick<
      ByCategoriesParams,
      "zipCode" | "audienceSegment" | "serviceAreas" | "preferredCity" | "preferredState" | "categories"
    >
  ): Promise<Partial<Record<CategoryKey, string[]>>>;
  prefetchCategoriesByZip?(params: ByCategoriesParams): Promise<void>;
}

function createGoogleProviderStrategy(): CommunityDataProviderStrategy {
  return {
    provider: CommunityDataProvider.Google,
    async getCommunityDataByZip(params) {
      return getGoogleCommunityDataByZip(
        params.zipCode,
        params.serviceAreas,
        params.preferredCity,
        params.preferredState,
        params.options
      );
    },
    async getCommunityDataByZipAndAudience(params) {
      return getGoogleCommunityDataByZipAndAudience(
        params.zipCode,
        params.audienceSegment,
        params.serviceAreas,
        params.preferredCity,
        params.preferredState
      );
    },
    async getCityDescription(params) {
      return getCityDescription(params.city ?? undefined, params.state ?? undefined);
    }
  };
}

function createPerplexityProviderStrategy(): CommunityDataProviderStrategy {
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
    async getCityDescription(params) {
      return getCityDescription(params.city ?? undefined, params.state ?? undefined);
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

export function createCommunityDataProviderRegistry() {
  const providers: Record<CommunityDataProvider, CommunityDataProviderStrategy> = {
    [CommunityDataProvider.Google]: createGoogleProviderStrategy(),
    [CommunityDataProvider.Perplexity]: createPerplexityProviderStrategy()
  };

  const primaryProvider = getCommunityDataProvider();

  return {
    getPrimaryProvider(): CommunityDataProviderStrategy {
      return providers[primaryProvider];
    },
    getFallbackProvider(): CommunityDataProviderStrategy | null {
      if (primaryProvider === CommunityDataProvider.Perplexity) {
        return providers[CommunityDataProvider.Google];
      }
      return null;
    },
    getProvider(provider: CommunityDataProvider): CommunityDataProviderStrategy {
      return providers[provider];
    }
  };
}
