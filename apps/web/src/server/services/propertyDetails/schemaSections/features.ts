export const EXTERIOR_FEATURES_SCHEMA = {
  type: ["object", "null"],
  additionalProperties: false,
  properties: {
    materials: { type: ["array", "null"], items: { type: "string" } },
    highlights: { type: ["array", "null"], items: { type: "string" } }
  }
} as const;

export const INTERIOR_FEATURES_SCHEMA = {
  type: ["object", "null"],
  additionalProperties: false,
  properties: {
    kitchen: {
      type: ["object", "null"],
      additionalProperties: false,
      properties: {
        features: {
          type: ["array", "null"],
          items: { type: "string" }
        }
      }
    },
    primary_suite: {
      type: ["object", "null"],
      additionalProperties: false,
      properties: {
        features: {
          type: ["array", "null"],
          items: { type: "string" }
        }
      }
    }
  }
} as const;
