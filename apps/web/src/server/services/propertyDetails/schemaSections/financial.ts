export const SALE_HISTORY_SCHEMA = {
  type: ["array", "null"],
  items: {
    type: "object",
    additionalProperties: false,
    properties: {
      event: { type: ["string", "null"] },
      close_date: { type: ["string", "null"] },
      sale_price_usd: { type: ["number", "null"] },
      price_per_sq_ft_usd: { type: ["number", "null"] },
      list_to_sale_percent_change: { type: ["number", "null"] },
      list_price_usd: { type: ["number", "null"] }
    }
  }
} as const;

export const VALUATION_ESTIMATES_SCHEMA = {
  type: ["object", "null"],
  additionalProperties: false,
  properties: {
    range_low_usd: { type: ["number", "null"] },
    range_high_usd: { type: ["number", "null"] },
    third_party_examples: {
      type: ["array", "null"],
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          provider: { type: ["string", "null"] },
          value_usd: { type: ["number", "null"] }
        }
      }
    }
  }
} as const;
