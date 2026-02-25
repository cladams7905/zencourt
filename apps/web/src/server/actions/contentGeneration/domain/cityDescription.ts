import { createChildLogger, logger as baseLogger } from "@web/src/lib/core/logging/logger";
import {
  CommunityDataProvider,
  getCommunityDataProvider
} from "@web/src/server/services/communityData/config";
import { generateTextForUseCase } from "@web/src/server/services/ai";
import {
  buildCityDescriptionPrompt,
  parseCityDescriptionResult
} from "@web/src/server/services/communityData/shared/cityDescription";
import { createCommunityCache } from "@web/src/server/services/communityData/providers/google/cache";

const logger = createChildLogger(baseLogger, {
  module: "content-generation-city-description"
});

export async function resolveCityDescription(args: {
  city?: string | null;
  state?: string | null;
}): Promise<string | null> {
  const { city, state } = args;
  if (!city || !state) {
    return null;
  }

  const communityCache = createCommunityCache(logger);
  const cached = await communityCache.getCachedCityDescription(city, state);
  if (cached) {
    return cached.description;
  }

  const result = await generateTextForUseCase({
    useCase: "city_description",
    system:
      "You write concise, factual city descriptions for real estate marketing prompts.",
    messages: [
      {
        role: "user",
        content: buildCityDescriptionPrompt(city, state)
      }
    ]
  });

  if (!result) {
    logger.warn(
      {
        city,
        state,
        provider:
          getCommunityDataProvider() === CommunityDataProvider.Perplexity
            ? "perplexity"
            : "anthropic"
      },
      "City description request failed"
    );
    return null;
  }

  const parsed = parseCityDescriptionResult(result);
  if (!parsed) {
    return null;
  }

  await communityCache.setCachedCityDescription(city, state, parsed);
  return parsed.description;
}
