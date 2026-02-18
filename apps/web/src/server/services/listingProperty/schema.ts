import type { PerplexityResponseFormat } from "../communityData/providers/perplexity";
import { ARCHITECTURE_ENUM, PROPERTY_TYPE_ENUM } from "./schemaSections/enums";
import {
  EXTERIOR_FEATURES_SCHEMA,
  INTERIOR_FEATURES_SCHEMA
} from "./schemaSections/features";
import {
  SALE_HISTORY_SCHEMA,
  VALUATION_ESTIMATES_SCHEMA
} from "./schemaSections/financial";
import { LOCATION_CONTEXT_SCHEMA } from "./schemaSections/location";
import { SOURCES_SCHEMA } from "./schemaSections/sources";

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
        sale_history: SALE_HISTORY_SCHEMA,
        valuation_estimates: VALUATION_ESTIMATES_SCHEMA,
        location_context: LOCATION_CONTEXT_SCHEMA,
        sources: SOURCES_SCHEMA
      }
    }
  }
};

export { PERPLEXITY_PROPERTY_SCHEMA };
