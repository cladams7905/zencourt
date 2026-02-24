export const SOURCES_SCHEMA = {
  type: ["array", "null"],
  items: {
    type: "object",
    additionalProperties: false,
    properties: {
      site: { type: ["string", "null"] },
      notes: { type: ["string", "null"] },
      citation: { type: ["string", "null"], format: "uri" }
    }
  }
} as const;
