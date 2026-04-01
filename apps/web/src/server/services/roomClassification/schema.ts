import { ROOM_CATEGORIES } from "@web/src/lib/domain/listings/image/roomCategories";

export const CLASSIFICATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    category: {
      type: "string",
      enum: Object.keys(ROOM_CATEGORIES)
    },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    shot_type: {
      type: "string",
      enum: ["room", "detail", "other"]
    },
    feature_tags: {
      type: "array",
      items: { type: "string" }
    },
    scores: {
      type: "object",
      additionalProperties: false,
      properties: {
        lighting: { type: "number", minimum: 0, maximum: 1 },
        framing: { type: "number", minimum: 0, maximum: 1 },
        coverage: { type: "number", minimum: 0, maximum: 1 },
        clarity: { type: "number", minimum: 0, maximum: 1 },
        motion_potential: { type: "number", minimum: 0, maximum: 1 },
        room_representativeness: {
          type: ["number", "null"],
          minimum: 0,
          maximum: 1
        },
        feature_appeal: {
          type: ["number", "null"],
          minimum: 0,
          maximum: 1
        }
      },
      required: [
        "lighting",
        "framing",
        "coverage",
        "clarity",
        "motion_potential",
        "room_representativeness",
        "feature_appeal"
      ]
    },
    perspective: {
      type: "string",
      enum: ["aerial", "ground", "none"]
    }
  },
  required: [
    "category",
    "confidence",
    "shot_type",
    "feature_tags",
    "scores",
    "perspective"
  ]
} as const;
