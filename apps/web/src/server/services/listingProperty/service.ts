import { createHash } from "crypto";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import { generateText } from "@web/src/server/services/ai";
import type { ListingPropertyDetails } from "@shared/types/models";
import { parsePossiblyWrappedJson } from "@web/src/server/utils/jsonParsing";
import { PERPLEXITY_PROPERTY_SCHEMA } from "./schema";
import { normalizeListingPropertyDetails } from "./domain/normalize";
import { parseListingPropertyRaw } from "./domain/parsing";
import {
  PROPERTY_DETAILS_PROMPT_VERSION,
  buildPropertyDetailsSystemPrompt,
  buildPropertyDetailsUserPrompt
} from "./prompts";

const logger = createChildLogger(baseLogger, {
  module: "listing-property-service"
});

function parsePerplexityJson(raw: unknown): unknown | null {
  return parsePossiblyWrappedJson(raw);
}

export function buildPropertyDetailsRevision(
  details: ListingPropertyDetails
): string {
  return createHash("sha256").update(JSON.stringify(details)).digest("hex");
}

export async function fetchPropertyDetailsFromPerplexity(
  address: string
): Promise<ListingPropertyDetails | null> {
  if (!address || address.trim() === "") {
    throw new Error("Address is required to fetch property details");
  }
  logger.info(
    { promptVersion: PROPERTY_DETAILS_PROMPT_VERSION },
    "Fetching property details with prompt version"
  );

  const result = await generateText({
    provider: "perplexity",
    messages: [
      { role: "system", content: buildPropertyDetailsSystemPrompt() },
      { role: "user", content: buildPropertyDetailsUserPrompt(address) }
    ],
    responseFormat: PERPLEXITY_PROPERTY_SCHEMA
  });

  const response = result?.raw as
    | { choices?: Array<{ message?: { content?: string } }> }
    | undefined;

  if (!response?.choices?.length) {
    logger.warn({ address }, "Perplexity property response empty");
    return null;
  }

  const content = response.choices[0]?.message?.content;
  const parsed = parsePerplexityJson(content);
  const rawPayload = parseListingPropertyRaw(parsed);
  const normalized = rawPayload
    ? normalizeListingPropertyDetails(rawPayload, address)
    : null;

  if (!normalized) {
    logger.warn({ address }, "Perplexity property response invalid");
  }

  return normalized;
}
