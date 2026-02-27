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
  buildPropertyDetailsSystemPrompt,
  buildPropertyDetailsUserPrompt
} from "../prompts";
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

export function createPerplexityPropertyDetailsProvider(deps: {
  runStructuredQuery: RunStructuredPropertyQuery;
}): PropertyDetailsProvider {
  return {
    name: "perplexity",
    async fetch(address: string): Promise<unknown | null> {
      const result = await deps.runStructuredQuery({
        systemPrompt: buildPropertyDetailsSystemPrompt(),
        userPrompt: buildPropertyDetailsUserPrompt(address),
        responseFormat: PERPLEXITY_PROPERTY_SCHEMA
      });

      const response = result as
        | { choices?: Array<{ message?: { content?: string } }> }
        | undefined;

      if (!response?.choices?.length) {
        return null;
      }

      const content = response.choices[0]?.message?.content;
      return parsePossiblyWrappedJson(content) ?? null;
    }
  };
}
