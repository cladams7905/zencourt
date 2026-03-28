const SHARED_PROPERTIES = {
  hook: { type: "string" },
  broll_query: { type: "string" },
  cta: { anyOf: [{ type: "string" }, { type: "null" }] },
  caption: { type: "string" }
} as const;

const IMAGE_BODY_SCHEMA = {
  anyOf: [
    { type: "null" },
    {
      type: "array",
      items: {
        type: "object",
        properties: {
          header: { type: "string" },
          content: { type: "string" },
          broll_query: { type: "string" },
          text_overlay: {
            anyOf: [
              { type: "null" },
              {
                type: "object",
                properties: {
                  accent_top: {
                    anyOf: [{ type: "string" }, { type: "null" }]
                  },
                  headline: { type: "string" },
                  accent_bottom: {
                    anyOf: [{ type: "string" }, { type: "null" }]
                  }
                },
                required: ["headline"],
                additionalProperties: false
              }
            ]
          }
        },
        required: ["header", "content", "broll_query", "text_overlay"],
        additionalProperties: false
      }
    }
  ]
} as const;

function buildContentItemSchema(mediaType: "image" | "video") {
  const body =
    mediaType === "video"
      ? {
          anyOf: [{ type: "null" }]
        }
      : IMAGE_BODY_SCHEMA;

  return {
  type: "object",
  properties: {
    ...SHARED_PROPERTIES,
    body
  },
  required: ["hook", "broll_query", "body", "cta", "caption"],
  additionalProperties: false
  } as const;
}

export function buildOutputFormat(mediaType: "image" | "video") {
  return {
    type: "json_schema",
    schema: {
      type: "array",
      items: buildContentItemSchema(mediaType),
      minItems: 1
    }
  } as const;
}
