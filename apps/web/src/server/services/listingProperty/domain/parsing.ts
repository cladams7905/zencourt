import { isRecord } from "@web/src/server/utils/normalization";

export type ListingPropertyRaw = Record<string, unknown>;

const ALLOWED_TOP_LEVEL_KEYS = new Set([
  "address",
  "property_type",
  "year_built",
  "living_area_sq_ft",
  "bedrooms",
  "bathrooms",
  "listing_price",
  "lot_size_acres",
  "stories",
  "architecture",
  "exterior_features",
  "interior_features",
  "living_spaces",
  "additional_spaces",
  "sale_history",
  "valuation_estimates",
  "location_context",
  "sources"
]);

export function parseListingPropertyRaw(raw: unknown): ListingPropertyRaw | null {
  if (!isRecord(raw)) {
    return null;
  }

  const parsed: ListingPropertyRaw = {};
  for (const [key, value] of Object.entries(raw)) {
    if (ALLOWED_TOP_LEVEL_KEYS.has(key)) {
      parsed[key] = value;
    }
  }

  return parsed;
}
