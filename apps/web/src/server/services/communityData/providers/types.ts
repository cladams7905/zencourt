import type { CommunityData } from "@web/src/lib/domain/market/types";
import type {
  CategoryKey,
  CommunityDataProvider
} from "@web/src/server/services/communityData/config";

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

