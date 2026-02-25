import {
  CommunityDataProvider,
  getCommunityDataProvider
} from "@web/src/server/services/_config/community";
import type { CommunityDataProviderStrategy } from "./providers/types";
import { createGoogleCommunityDataProvider } from "./providers/google";
import { createPerplexityCommunityDataProvider } from "./providers/perplexity";

export type {
  ByZipParams,
  ByAudienceParams,
  ByCategoriesParams,
  CommunityDataProviderStrategy
} from "./providers/types";

export function createCommunityDataProviderRegistry() {
  const providers: Record<CommunityDataProvider, CommunityDataProviderStrategy> = {
    [CommunityDataProvider.Google]: createGoogleCommunityDataProvider(),
    [CommunityDataProvider.Perplexity]: createPerplexityCommunityDataProvider()
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
