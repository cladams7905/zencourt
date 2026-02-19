import type { CommunityData } from "@web/src/lib/domain/market/types";
import type { Redis } from "@web/src/lib/cache/redisClient";
import type { CategoryKey } from "@web/src/server/services/communityData/config";
import {
  COMMUNITY_CATEGORY_KEYS,
  COMMUNITY_CATEGORY_KEY_TO_CATEGORY,
  peekNextCommunityCategories,
  selectCommunityCategories,
  type CommunityCategoryKey
} from "@web/src/server/services/contentRotation";
import {
  createCommunityDataProviderRegistry,
  type CommunityDataProviderStrategy
} from "./registry";

type ByZipOptions = {
  skipCategories?: Set<CategoryKey>;
  writeCache?: boolean;
};

export type CommunityContentContextParams = {
  redis: Redis | null;
  userId: string;
  category: string;
  zipCode: string;
  audienceSegment?: string | null;
  serviceAreas?: string[] | null;
  preferredCity?: string | null;
  preferredState?: string | null;
};

export type CommunityContentContext = {
  communityData: CommunityData | null;
  cityDescription: string | null;
  communityCategoryKeys: CommunityCategoryKey[] | null;
  seasonalExtraSections: Record<string, string> | null;
};

async function getCommunityDataByZipWithFallback(
  provider: CommunityDataProviderStrategy,
  fallback: CommunityDataProviderStrategy | null,
  params: {
    zipCode: string;
    serviceAreas?: string[] | null;
    preferredCity?: string | null;
    preferredState?: string | null;
    options?: ByZipOptions;
  }
): Promise<CommunityData | null> {
  try {
    const data = await provider.getCommunityDataByZip(params);
    if (data === undefined) {
      return null;
    }
    if (data) {
      return data;
    }
  } catch {
    // Fallback to secondary provider when primary request path fails.
  }

  if (!fallback) {
    return null;
  }

  const fallbackData = await fallback.getCommunityDataByZip(params);
  return fallbackData ?? null;
}

async function getCommunityDataByZipAndAudienceWithFallback(
  provider: CommunityDataProviderStrategy,
  fallback: CommunityDataProviderStrategy | null,
  params: {
    zipCode: string;
    audienceSegment?: string;
    serviceAreas?: string[] | null;
    preferredCity?: string | null;
    preferredState?: string | null;
  }
): Promise<CommunityData | null> {
  try {
    const data = await provider.getCommunityDataByZipAndAudience(params);
    if (data === undefined) {
      return null;
    }
    if (data) {
      return data;
    }
  } catch {
    // Fallback to secondary provider when primary request path fails.
  }

  if (!fallback) {
    return null;
  }

  const fallbackData = await fallback.getCommunityDataByZipAndAudience(params);
  return fallbackData ?? null;
}

function toCategoryKey(categoryKey: CommunityCategoryKey): CategoryKey | null {
  return COMMUNITY_CATEGORY_KEY_TO_CATEGORY[categoryKey] ?? null;
}

function toAvailableCategoryKeys(
  communityData: CommunityData
): CommunityCategoryKey[] {
  const seasonalSections = communityData.seasonal_geo_sections ?? {};
  const seasonalKeys = Object.entries(seasonalSections)
    .filter(([, value]) => {
      if (!value) {
        return false;
      }
      const normalized = value.trim().toLowerCase();
      return normalized !== "" && !normalized.includes("(none found)");
    })
    .map(([key]) => key);

  return COMMUNITY_CATEGORY_KEYS.filter((key) => {
    const value = (communityData as Record<string, unknown>)[key];
    if (typeof value !== "string") {
      return false;
    }
    const normalized = value.trim().toLowerCase();
    return normalized !== "" && !normalized.includes("(none found)");
  }).concat(seasonalKeys);
}

export function createCommunityDataOrchestrator() {
  async function getCommunityDataByZip(
    zipCode: string,
    serviceAreas?: string[] | null,
    preferredCity?: string | null,
    preferredState?: string | null,
    options?: ByZipOptions
  ): Promise<CommunityData | null> {
    if (!zipCode) {
      return null;
    }

    const registry = createCommunityDataProviderRegistry();
    return getCommunityDataByZipWithFallback(
      registry.getPrimaryProvider(),
      registry.getFallbackProvider(),
      {
        zipCode,
        serviceAreas,
        preferredCity,
        preferredState,
        options
      }
    );
  }

  async function getCommunityDataByZipAndAudience(
    zipCode: string,
    audienceSegment?: string,
    serviceAreas?: string[] | null,
    preferredCity?: string | null,
    preferredState?: string | null
  ): Promise<CommunityData | null> {
    if (!zipCode) {
      return null;
    }

    const registry = createCommunityDataProviderRegistry();
    return getCommunityDataByZipAndAudienceWithFallback(
      registry.getPrimaryProvider(),
      registry.getFallbackProvider(),
      {
        zipCode,
        audienceSegment,
        serviceAreas,
        preferredCity,
        preferredState
      }
    );
  }

  async function getCommunityContentContext(
    params: CommunityContentContextParams
  ): Promise<CommunityContentContext> {
    if (!params.zipCode) {
      return {
        communityData: null,
        cityDescription: null,
        communityCategoryKeys: null,
        seasonalExtraSections: null
      };
    }

    let communityData: CommunityData | null = null;
    let cityDescription: string | null = null;
    let communityCategoryKeys: CommunityCategoryKey[] | null = null;
    let seasonalExtraSections: Record<string, string> | null = null;
    const registry = createCommunityDataProviderRegistry();
    const primary = registry.getPrimaryProvider();
    const fallback = registry.getFallbackProvider();

    if (
      params.category === "seasonal" &&
      primary.getMonthlyEventsSectionByZip
    ) {
      const seasonalSection = await primary.getMonthlyEventsSectionByZip({
        zipCode: params.zipCode,
        audienceSegment: params.audienceSegment ?? undefined,
        preferredCity: params.preferredCity,
        preferredState: params.preferredState
      });
      if (seasonalSection?.key && seasonalSection.value) {
        seasonalExtraSections = {
          [seasonalSection.key]: seasonalSection.value
        };
      }
    }

    if (params.category === "community") {
      if (
        primary.getCommunityDataByZipAndAudienceForCategories &&
        primary.getMonthlyEventsSectionByZip
      ) {
        const eventsSection = await primary.getMonthlyEventsSectionByZip({
          zipCode: params.zipCode,
          audienceSegment: params.audienceSegment ?? undefined,
          preferredCity: params.preferredCity,
          preferredState: params.preferredState
        });
        const availableKeys = COMMUNITY_CATEGORY_KEYS.concat(
          eventsSection ? [eventsSection.key] : []
        );
        const selection = await selectCommunityCategories(
          params.redis,
          params.userId,
          2,
          availableKeys
        );
        communityCategoryKeys = selection.selected;

        const selectedCategoryKeys = selection.selected
          .map(toCategoryKey)
          .filter((value): value is CategoryKey => Boolean(value));
        const avoidRecommendations =
          selection.shouldRefresh &&
          primary.getAvoidRecommendationsForCategories
            ? await primary.getAvoidRecommendationsForCategories({
                zipCode: params.zipCode,
                audienceSegment: params.audienceSegment ?? undefined,
                serviceAreas: params.serviceAreas,
                preferredCity: params.preferredCity,
                preferredState: params.preferredState,
                categories: selectedCategoryKeys
              })
            : null;

        communityData =
          await primary.getCommunityDataByZipAndAudienceForCategories({
            zipCode: params.zipCode,
            categories: selectedCategoryKeys,
            audienceSegment: params.audienceSegment ?? undefined,
            serviceAreas: params.serviceAreas,
            preferredCity: params.preferredCity,
            preferredState: params.preferredState,
            eventsSection,
            options: {
              forceRefresh: selection.shouldRefresh,
              avoidRecommendations
            }
          });

        const nextKeys = await peekNextCommunityCategories(
          params.redis,
          params.userId,
          2
        );
        const nextCategoryKeys = nextKeys
          .map(toCategoryKey)
          .filter((value): value is CategoryKey => Boolean(value));
        if (nextCategoryKeys.length > 0 && primary.prefetchCategoriesByZip) {
          void primary.prefetchCategoriesByZip({
            zipCode: params.zipCode,
            categories: nextCategoryKeys,
            audienceSegment: params.audienceSegment ?? undefined,
            serviceAreas: params.serviceAreas,
            preferredCity: params.preferredCity,
            preferredState: params.preferredState
          });
        }
      } else {
        communityData = await getCommunityDataByZipAndAudienceWithFallback(
          primary,
          fallback,
          {
            zipCode: params.zipCode,
            audienceSegment: params.audienceSegment ?? undefined,
            serviceAreas: params.serviceAreas,
            preferredCity: params.preferredCity,
            preferredState: params.preferredState
          }
        );
      }
    }

    if (params.category === "community" && communityData) {
      const availableKeys = toAvailableCategoryKeys(communityData);
      const selectedKeys =
        communityCategoryKeys ??
        (
          await selectCommunityCategories(
            params.redis,
            params.userId,
            2,
            availableKeys
          )
        ).selected;
      communityCategoryKeys = selectedKeys;
    }

    if (params.category === "community" || params.category === "seasonal") {
      cityDescription = primary.getCityDescription
        ? await primary.getCityDescription({
            city: params.preferredCity,
            state: params.preferredState
          })
        : null;
    }

    return {
      communityData,
      cityDescription,
      communityCategoryKeys,
      seasonalExtraSections
    };
  }

  return {
    getCommunityDataByZip,
    getCommunityDataByZipAndAudience,
    getCommunityContentContext
  };
}
