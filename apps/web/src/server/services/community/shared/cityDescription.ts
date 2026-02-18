import {
  CommunityDataProvider,
  getCommunityDataProvider
} from "@web/src/server/services/community/config";
import { fetchPerplexityCityDescription } from "../providers/perplexity/pipeline/cityDescription";
import type { CityDescriptionCachePayload } from "../providers/google/cache";

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CITY_DESCRIPTION_MODEL = "claude-haiku-4-5-20251001";
const CITY_DESCRIPTION_MAX_TOKENS = 160;

type LoggerLike = {
  warn: (...args: unknown[]) => void;
};

type ClaudeMessageResponse = {
  content?: Array<{
    type?: string;
    text?: string;
  }>;
};

function getClaudeApiKey(logger: LoggerLike): string | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logger.warn(
      "ANTHROPIC_API_KEY is not configured; city description disabled"
    );
    return null;
  }
  return apiKey;
}

function buildCityDescriptionPrompt(city: string, state: string): string {
  return `Write a 2-3 sentence high-quality description summarizing the city of ${city}, ${state}. This should include the general vibe of the area, places of interest, and its proximity to other things in the geographic region. Keep it brief but informative. Output only the sentences.`;
}

export async function fetchCityDescription(
  city: string,
  state: string,
  logger: LoggerLike
): Promise<CityDescriptionCachePayload | null> {
  if (getCommunityDataProvider() === CommunityDataProvider.Perplexity) {
    return fetchPerplexityCityDescription(city, state);
  }
  const apiKey = getClaudeApiKey(logger);
  if (!apiKey) {
    return null;
  }

  const response = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: CITY_DESCRIPTION_MODEL,
      max_tokens: CITY_DESCRIPTION_MAX_TOKENS,
      system:
        "You write concise, factual city descriptions for real estate marketing prompts.",
      messages: [
        {
          role: "user",
          content: buildCityDescriptionPrompt(city, state)
        }
      ]
    })
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    logger.warn(
      { status: response.status, errorPayload, city, state },
      "Claude city description request failed"
    );
    return null;
  }

  const payload = (await response.json()) as ClaudeMessageResponse;
  const text = payload.content?.find((item) => item.type === "text")?.text;
  if (!text) {
    return null;
  }

  const description = text.replace(/\s+/g, " ").trim();
  return description ? { description } : null;
}
