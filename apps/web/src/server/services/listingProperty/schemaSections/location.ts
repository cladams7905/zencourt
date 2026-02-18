import { LOT_TYPE_ENUM, STREET_TYPE_ENUM, US_STATE_ENUM } from "./enums";

export const LOCATION_CONTEXT_SCHEMA = {
  type: ["object", "null"],
  additionalProperties: false,
  properties: {
    subdivision: { type: ["string", "null"] },
    street_type: {
      type: ["string", "null"],
      enum: [...STREET_TYPE_ENUM]
    },
    lot_type: {
      type: ["string", "null"],
      enum: [...LOT_TYPE_ENUM]
    },
    county: { type: ["string", "null"] },
    state: {
      type: ["string", "null"],
      enum: [...US_STATE_ENUM]
    }
  }
} as const;
