export const OPEN_HOUSE_EVENTS_SCHEMA = {
  type: ["array", "null"],
  items: {
    type: "object",
    additionalProperties: false,
    properties: {
      date: { type: ["string", "null"] },
      start_time: { type: ["string", "null"] },
      end_time: { type: ["string", "null"] }
    }
  }
} as const;
