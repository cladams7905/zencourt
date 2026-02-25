import { createChildLogger, logger as baseLogger } from "@web/src/lib/core/logging/logger";
import {
  requestPerplexity,
  type PerplexityMessage,
  type PerplexityResponseFormat
} from "@web/src/server/integrations/perplexity";

const logger = createChildLogger(baseLogger, {
  module: "community-perplexity-city-description"
});

export type CityDescriptionPayload = {
  description: string;
  citations?: Array<{
    title?: string | null;
    url?: string | null;
    source?: string | null;
  }> | null;
};

const CITY_DESCRIPTION_SCHEMA: PerplexityResponseFormat = {
  type: "json_schema",
  json_schema: {
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["description"],
      properties: {
        description: { type: ["string", "null"] },
        citations: {
          type: ["array", "null"],
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: ["string", "null"] },
              url: { type: ["string", "null"] },
              source: { type: ["string", "null"] }
            }
          }
        }
      }
    }
  }
};

function buildCityDescriptionMessages(
  city: string,
  state: string
): PerplexityMessage[] {
  const system = [
    "You write concise, factual city descriptions for real estate marketing prompts.",
    "Return only JSON that matches the provided schema.",
    "Keep it to 1-2 sentences."
  ].join(" ");

  const user = [
    `Location: ${city}, ${state}.`,
    "Write a 1-2 sentence description of the city.",
    "Include notable local character or geography.",
    "Include citations for factual claims."
  ].join("\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user }
  ];
}

export async function fetchPerplexityCityDescription(
  city: string,
  state: string
): Promise<CityDescriptionPayload | null> {
  const response = await requestPerplexity({
    messages: buildCityDescriptionMessages(city, state),
    response_format: CITY_DESCRIPTION_SCHEMA,
    max_tokens: 300
  });
  if (!response) {
    return null;
  }

  const raw = response.choices?.[0]?.message?.content;
  if (!raw) {
    return null;
  }

  let payload: CityDescriptionPayload | null = null;
  try {
    payload = JSON.parse(raw) as CityDescriptionPayload;
  } catch (error) {
    logger.warn(
      { error: error instanceof Error ? error.message : String(error) },
      "Failed to parse Perplexity city description JSON"
    );
    return null;
  }

  const description = payload?.description?.trim() ?? "";
  if (!description) {
    return null;
  }

  return {
    description,
    citations: payload?.citations ?? null
  };
}
