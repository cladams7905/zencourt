import {
  DomainDependencyError,
  DomainValidationError
} from "@web/src/server/errors/domain";
import type { PromptAssemblyInput } from "@web/src/lib/ai/prompts/engine/assemble";
import { parseMarketLocation } from "./domain/marketLocation";
import { getMarketData } from "@web/src/server/services/marketData";
import { getCommunityContentContext } from "@web/src/server/services/communityData/service";
import type { CommunityCategoryKey } from "@web/src/server/services/contentRotation";
import type { UserAdditionalSnapshot } from "@web/src/server/models/userAdditional";
import type { Redis } from "@web/src/server/services/cache/redis";

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

    marketData = await getMarketData(marketLocation);
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
    const context = await getCommunityContentContext({
      redis,
      userId,
      category: body.category,
      zipCode: marketLocation.zip_code,
      audienceSegment: activeAudience,
      serviceAreas: snapshot.serviceAreas,
      preferredCity: marketLocation.city,
      preferredState: marketLocation.state
    });

    communityData = context.communityData;
    cityDescription = context.cityDescription;
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
