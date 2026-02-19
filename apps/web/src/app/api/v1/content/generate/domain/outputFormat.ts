const CONTENT_ITEM_SCHEMA = {
  type: "object",
  properties: {
    hook: { type: "string" },
    broll_query: { type: "string" },
    body: {
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
    },
    cta: { anyOf: [{ type: "string" }, { type: "null" }] },
    caption: { type: "string" }
  },
  required: ["hook", "broll_query", "body", "cta", "caption"],
  additionalProperties: false
};

export const OUTPUT_FORMAT = {
  type: "json_schema",
  schema: {
    type: "array",
    items: CONTENT_ITEM_SCHEMA,
    minItems: 1
  }
};
