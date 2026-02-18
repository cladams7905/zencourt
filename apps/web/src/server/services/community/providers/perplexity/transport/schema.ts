import type { AudienceSegment, CategoryKey } from "@web/src/server/services/community/config";
import type { PerplexityResponseFormat } from "./types";
import { getWhySuitableFieldKey } from "./helpers";

const NULLABLE_STRING = { type: ["string", "null"] };
const NULLABLE_NUMBER = { type: ["number", "null"] };

export function buildPerplexityCategorySchema(
  category: CategoryKey,
  audience?: AudienceSegment
): Record<string, unknown> {
  const whyKey = getWhySuitableFieldKey(audience);
  const itemSchema: Record<string, unknown> = {
    type: "object",
    additionalProperties: false,
    required: ["name"],
    properties: {
      name: { type: "string" },
      location: NULLABLE_STRING,
      drive_distance_minutes: NULLABLE_NUMBER,
      dates: NULLABLE_STRING,
      description: NULLABLE_STRING,
      cost: NULLABLE_STRING,
      [whyKey]: NULLABLE_STRING,
      cuisine: {
        type: ["array", "null"],
        items: { type: "string" }
      },
      disclaimer: NULLABLE_STRING,
      citations: {
        type: ["array", "null"],
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: NULLABLE_STRING,
            url: NULLABLE_STRING,
            source: NULLABLE_STRING
          }
        }
      }
    }
  };

  if (category !== "dining" && category !== "coffee_brunch") {
    delete (itemSchema.properties as Record<string, unknown>).cuisine;
  }

  if (category !== "nature_outdoors") {
    delete (itemSchema.properties as Record<string, unknown>).disclaimer;
  }

  return {
    type: "object",
    additionalProperties: false,
    required: ["items"],
    properties: {
      items: {
        type: "array",
        items: itemSchema
      }
    }
  };
}

export function buildPerplexityResponseFormat(
  category: CategoryKey,
  audience?: AudienceSegment
): PerplexityResponseFormat {
  return {
    type: "json_schema",
    json_schema: {
      name: `community_${category}`,
      schema: buildPerplexityCategorySchema(category, audience)
    }
  };
}
