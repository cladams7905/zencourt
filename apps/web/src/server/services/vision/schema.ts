import { ROOM_CATEGORIES } from "@web/src/lib/domain/listing/vision";

export const CLASSIFICATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    category: {
      type: "string",
      enum: Object.keys(ROOM_CATEGORIES)
    },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    primary_score: { type: "number", minimum: 0, maximum: 1 },
    perspective: {
      type: "string",
      enum: ["aerial", "ground", "none"]
    }
  },
  required: ["category", "confidence", "primary_score", "perspective"]
} as const;
