import {
  CommunityDataProvider,
  getCommunityDataProvider
} from "@web/src/server/services/communityData/config";
import { generateText, type AIProviderName } from "@web/src/server/services/ai";
import type { CityDescriptionCachePayload } from "../providers/google/cache";

const CITY_DESCRIPTION_MODEL = "claude-haiku-4-5-20251001";
const CITY_DESCRIPTION_MAX_TOKENS = 160;
const CITY_DESCRIPTION_PROVIDER_ENV = "CITY_DESCRIPTION_PROVIDER";

type LoggerLike = {
  warn: (...args: unknown[]) => void;
};

function resolveCityDescriptionProvider(): AIProviderName {
  const override = process.env[CITY_DESCRIPTION_PROVIDER_ENV];
  if (override === "anthropic" || override === "perplexity") {
    return override;
  }

  return getCommunityDataProvider() === CommunityDataProvider.Perplexity
    ? "perplexity"
    : "anthropic";
}

function buildCityDescriptionPrompt(city: string, state: string): string {
  return `Write a 2-3 sentence high-quality description summarizing the city of ${city}, ${state}. This should include the general vibe of the area, places of interest, and its proximity to other things in the geographic region. Keep it brief but informative. Output only the sentences.`;
}

function parseCityDescriptionResult(result: {
  text: string | null;
  citations?: Array<{ title?: string; url?: string; source?: string }>;
}): CityDescriptionCachePayload | null {
  const text = result.text?.trim();
  if (!text) {
    return null;
  }

  try {
    const parsed = JSON.parse(text) as {
      description?: string | null;
      citations?: Array<{
        title?: string | null;
        url?: string | null;
        source?: string | null;
      }> | null;
    };
    const description = parsed.description?.replace(/\s+/g, " ").trim() ?? "";
    if (!description) {
      return null;
    }
    return {
      description,
      citations: parsed.citations
        ? parsed.citations.map((citation) => ({
            ...(citation.title ? { title: citation.title } : {}),
            ...(citation.url ? { url: citation.url } : {}),
            ...(citation.source ? { source: citation.source } : {})
          }))
        : (result.citations ?? null)
    };
  } catch {
    const description = text.replace(/\s+/g, " ").trim();
    return description
      ? {
          description,
          citations: result.citations ?? null
        }
      : null;
  }
}

export async function fetchCityDescription(
  city: string,
  state: string,
  logger: LoggerLike
): Promise<CityDescriptionCachePayload | null> {
  const provider = resolveCityDescriptionProvider();

  const result = await generateText({
    provider,
    model: provider === "anthropic" ? CITY_DESCRIPTION_MODEL : undefined,
    maxTokens: CITY_DESCRIPTION_MAX_TOKENS,
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
    logger.warn({ city, state, provider }, "City description request failed");
    return null;
  }

  return parseCityDescriptionResult(result);
}
