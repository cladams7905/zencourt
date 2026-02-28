import type { PerplexityResponseFormat } from "@web/src/server/services/_integrations/perplexity";
import { parsePossiblyWrappedJson } from "@web/src/server/utils/jsonParsing";
import { ARCHITECTURE_ENUM, PROPERTY_TYPE_ENUM } from "../schemaSections/enums";
import {
  EXTERIOR_FEATURES_SCHEMA,
  INTERIOR_FEATURES_SCHEMA
} from "../schemaSections/features";
import {
  SALE_HISTORY_SCHEMA,
  VALUATION_ESTIMATES_SCHEMA
} from "../schemaSections/financial";
import { OPEN_HOUSE_EVENTS_SCHEMA } from "../schemaSections/events";
import { LOCATION_CONTEXT_SCHEMA } from "../schemaSections/location";
import { SOURCES_SCHEMA } from "../schemaSections/sources";
import {
  buildOpenHouseSystemPrompt,
  buildOpenHouseUserPrompt,
  buildPropertyDetailsSystemPrompt,
  buildPropertyDetailsUserPrompt
} from "../prompts";
import { writePropertyDetailsProviderLog } from "../logging";
import type {
  RunStructuredPropertyQuery,
  PropertyDetailsProvider
} from "./types";

const PERPLEXITY_PROPERTY_SCHEMA: PerplexityResponseFormat = {
  type: "json_schema",
  json_schema: {
    name: "property_details",
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "address",
        "property_type",
        "year_built",
        "living_area_sq_ft",
        "bedrooms",
        "bathrooms",
        "lot_size_acres",
        "stories",
        "architecture",
        "exterior_features",
        "interior_features",
        "living_spaces",
        "additional_spaces",
        "open_house_events",
        "sale_history",
        "valuation_estimates",
        "location_context",
        "sources"
      ],
      properties: {
        address: { type: ["string", "null"] },
        property_type: {
          type: ["string", "null"],
          enum: [...PROPERTY_TYPE_ENUM]
        },
        year_built: { type: ["number", "null"] },
        living_area_sq_ft: { type: ["number", "null"] },
        bedrooms: { type: ["number", "null"] },
        bathrooms: { type: ["number", "null"] },
        listing_price: { type: ["number", "null"] },
        lot_size_acres: { type: ["number", "null"] },
        stories: { type: ["number", "null"] },
        architecture: {
          type: ["string", "null"],
          enum: [...ARCHITECTURE_ENUM]
        },
        exterior_features: EXTERIOR_FEATURES_SCHEMA,
        interior_features: INTERIOR_FEATURES_SCHEMA,
        living_spaces: { type: ["array", "null"], items: { type: "string" } },
        additional_spaces: {
          type: ["array", "null"],
          items: { type: "string" }
        },
        open_house_events: OPEN_HOUSE_EVENTS_SCHEMA,
        sale_history: SALE_HISTORY_SCHEMA,
        valuation_estimates: VALUATION_ESTIMATES_SCHEMA,
        location_context: LOCATION_CONTEXT_SCHEMA,
        sources: SOURCES_SCHEMA
      }
    }
  }
};

const PERPLEXITY_OPEN_HOUSE_SCHEMA: PerplexityResponseFormat = {
  type: "json_schema",
  json_schema: {
    name: "property_open_house_details",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["open_house_events", "sources"],
      properties: {
        open_house_events: OPEN_HOUSE_EVENTS_SCHEMA,
        sources: SOURCES_SCHEMA
      }
    }
  }
};

function parseResponseContent(result: unknown): unknown | null {
  const response = result as
    | { choices?: Array<{ message?: { content?: string } }> }
    | undefined;
  if (!response?.choices?.length) {
    return null;
  }
  const content = response.choices[0]?.message?.content;
  return parsePossiblyWrappedJson(content) ?? null;
}

const OPEN_HOUSE_SOURCE_HOSTS = ["zillow.com", "redfin.com", "realtor.com"];

function toHostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isVerifiedOpenHouseSourceUrl(url: string): boolean {
  const hostname = toHostname(url);
  if (!hostname) {
    return false;
  }
  return OPEN_HOUSE_SOURCE_HOSTS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );
}

function extractVerifiedListingUrls(
  primaryResult: unknown,
  primaryPayload: unknown
): string[] {
  const candidates: string[] = [];

  if (isObjectRecord(primaryResult)) {
    const citations = primaryResult.citations;
    if (Array.isArray(citations)) {
      for (const entry of citations) {
        if (typeof entry === "string") {
          candidates.push(entry);
        }
      }
    }

    const searchResults = primaryResult.search_results;
    if (Array.isArray(searchResults)) {
      for (const entry of searchResults) {
        if (isObjectRecord(entry) && typeof entry.url === "string") {
          candidates.push(entry.url);
        }
      }
    }
  }

  if (isObjectRecord(primaryPayload) && Array.isArray(primaryPayload.sources)) {
    for (const source of primaryPayload.sources) {
      if (isObjectRecord(source) && typeof source.citation === "string") {
        candidates.push(source.citation);
      }
    }
  }

  const seen = new Set<string>();
  const filtered: string[] = [];
  for (const url of candidates) {
    if (!isVerifiedOpenHouseSourceUrl(url) || seen.has(url)) {
      continue;
    }
    seen.add(url);
    filtered.push(url);
    if (filtered.length >= 6) {
      break;
    }
  }

  return filtered;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeSources(
  primarySources: unknown,
  openHouseSources: unknown
): unknown {
  const primary = Array.isArray(primarySources) ? primarySources : [];
  const fallback = Array.isArray(openHouseSources) ? openHouseSources : [];
  if (primary.length === 0 && fallback.length === 0) {
    return undefined;
  }

  const seen = new Set<string>();
  return [...primary, ...fallback].filter((entry) => {
    if (!isObjectRecord(entry)) {
      return false;
    }
    const site = typeof entry.site === "string" ? entry.site : "";
    const citation = typeof entry.citation === "string" ? entry.citation : "";
    const key = `${site}|${citation}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function mergePropertyPayloads(
  primaryPayload: unknown,
  openHousePayload: unknown
): unknown {
  if (!isObjectRecord(primaryPayload)) {
    return primaryPayload;
  }
  if (!isObjectRecord(openHousePayload)) {
    return primaryPayload;
  }

  const merged: Record<string, unknown> = { ...primaryPayload };
  if (Array.isArray(openHousePayload.open_house_events)) {
    merged.open_house_events = openHousePayload.open_house_events;
  }
  const sources = mergeSources(primaryPayload.sources, openHousePayload.sources);
  if (sources !== undefined) {
    merged.sources = sources;
  }
  return merged;
}

export function createPerplexityPropertyDetailsProvider(deps: {
  runStructuredQuery: RunStructuredPropertyQuery;
}): PropertyDetailsProvider {
  return {
    name: "perplexity",
    async fetch(address: string): Promise<unknown | null> {
      const systemPrompt = buildPropertyDetailsSystemPrompt();
      const userPrompt = buildPropertyDetailsUserPrompt(address);
      const openHouseSystemPrompt = buildOpenHouseSystemPrompt();
      const result = await deps.runStructuredQuery({
        systemPrompt,
        userPrompt,
        responseFormat: PERPLEXITY_PROPERTY_SCHEMA
      });
      const primaryPayload = parseResponseContent(result);
      const verifiedListingUrls = extractVerifiedListingUrls(
        result,
        primaryPayload
      );
      const openHouseUserPrompt = buildOpenHouseUserPrompt(
        address,
        verifiedListingUrls
      );
      const openHouseResult = await deps.runStructuredQuery({
        systemPrompt: openHouseSystemPrompt,
        userPrompt: openHouseUserPrompt,
        responseFormat: PERPLEXITY_OPEN_HOUSE_SCHEMA
      });
      const providerRequest =
        result && typeof result === "object" && !Array.isArray(result)
          ? (result as Record<string, unknown>)._request
          : undefined;
      const openHouseProviderRequest =
        openHouseResult && typeof openHouseResult === "object" && !Array.isArray(openHouseResult)
          ? (openHouseResult as Record<string, unknown>)._request
          : undefined;

      await writePropertyDetailsProviderLog({
        provider: "perplexity",
        address,
        query: {
          systemPrompt,
          userPrompt,
          responseFormat: PERPLEXITY_PROPERTY_SCHEMA,
          providerRequest,
          openHouseOnly: {
            systemPrompt: openHouseSystemPrompt,
            userPrompt: openHouseUserPrompt,
            responseFormat: PERPLEXITY_OPEN_HOUSE_SCHEMA,
            providerRequest: openHouseProviderRequest
          }
        },
        response: result,
        openHouseOnlyResponse: openHouseResult
      });
      if (!primaryPayload) {
        return null;
      }
      const openHousePayload = parseResponseContent(openHouseResult);
      return mergePropertyPayloads(primaryPayload, openHousePayload);
    }
  };
}
