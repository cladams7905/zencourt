import {
  DomainDependencyError,
  DomainValidationError
} from "@web/src/server/errors/domain";
import type { PromptAssemblyInput } from "@web/src/lib/ai/prompts/engine/assemble";
import { parseMarketLocation } from "./domain/marketLocation";
import { resolveCityDescription } from "./domain/cityDescription";
import {
  createMarketDataService,
  createMarketDataProviderRegistry
} from "@web/src/server/services/marketData";
import { generateText } from "@web/src/server/services/ai";
import type { AITextRequest } from "@web/src/server/services/ai";
import { getCommunityContentContext } from "@web/src/server/services/communityData/service";
import {
  COMMUNITY_CATEGORY_KEYS,
  peekNextCommunityCategories,
  selectCommunityCategories,
  type CommunityCategoryKey
} from "@web/src/server/services/contentRotation";
import type { UserAdditionalSnapshot } from "@web/src/server/models/userAdditional";
import type { Redis } from "@web/src/server/infra/cache/redis";

export type ResolvedContentContext = {
  marketData: PromptAssemblyInput["market_data"];
  communityData: PromptAssemblyInput["community_data"];
  cityDescription: PromptAssemblyInput["city_description"];
  communityCategoryKeys: CommunityCategoryKey[] | null;
  seasonalExtraSections: Record<string, string> | null;
};

export async function resolveContentContext(args: {
  body: PromptAssemblyInput;
  snapshot: UserAdditionalSnapshot;
  userId: string;
  redis: Redis | null;
  activeAudience: string | null;
}): Promise<ResolvedContentContext> {
  const { body, snapshot, userId, redis, activeAudience } = args;
  const marketLocation = parseMarketLocation(snapshot.location);

  let marketData = null;
  let communityData = null;
  let cityDescription = null;
  let communityCategoryKeys: CommunityCategoryKey[] | null = null;
  let seasonalExtraSections: Record<string, string> | null = null;

  if (body.category === "market_insights") {
    if (!marketLocation) {
      throw new DomainValidationError(
        "Please add a valid US location and zip code to your profile."
      );
    }

    marketData = await marketDataService.getMarketData(marketLocation);
    if (!marketData) {
      throw new DomainDependencyError(
        "Market data is not configured. Please try again later."
      );
    }
  }

  if (
    (body.category === "community" || body.category === "seasonal") &&
    marketLocation
  ) {
    const communitySelection =
      body.category === "community"
        ? await selectCommunityCategories(
            redis,
            userId,
            2,
            COMMUNITY_CATEGORY_KEYS
          )
        : { selected: [] as CommunityCategoryKey[], shouldRefresh: false };
    const nextCommunityCategoryKeys =
      body.category === "community"
        ? await peekNextCommunityCategories(redis, userId, 2)
        : [];

    const context = await getCommunityContentContext({
      category: body.category,
      zipCode: marketLocation.zip_code,
      audienceSegment: activeAudience,
      serviceAreas: snapshot.serviceAreas,
      preferredCity: marketLocation.city,
      preferredState: marketLocation.state,
      selectedCommunityCategoryKeys: communitySelection.selected,
      shouldRefreshCommunityCategories: communitySelection.shouldRefresh,
      nextCommunityCategoryKeys
    });

    communityData = context.communityData;
    cityDescription = await resolveCityDescription({
      city: marketLocation.city,
      state: marketLocation.state
    });
    communityCategoryKeys = context.communityCategoryKeys;
    seasonalExtraSections = context.seasonalExtraSections;
  }

  return {
    marketData,
    communityData,
    cityDescription,
    communityCategoryKeys,
    seasonalExtraSections
  };
}
const marketDataService = createMarketDataService({
  providerRegistry: createMarketDataProviderRegistry({
    env: process.env,
    fetcher: (() =>
      Promise.reject(
        new Error("fetch not configured")
      )) as unknown as typeof fetch,
    now: () => new Date(),
    logger: {
      warn: () => undefined,
      error: () => undefined
    },
    runStructuredMarketQuery: async ({
      messages,
      responseFormat,
      maxTokens
    }) => {
      const result = await generateText({
        provider: "perplexity",
        messages,
        responseFormat: responseFormat as AITextRequest["responseFormat"],
        maxTokens
      });
      return result?.raw ?? null;
    }
  })
});
