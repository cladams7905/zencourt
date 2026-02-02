import { createHash } from "crypto";
import { createChildLogger, logger as baseLogger } from "@web/src/lib/logger";
import { requestPerplexity } from "./community/perplexity/client";
import type { PerplexityResponseFormat } from "./community/perplexity/types";
import type { ListingPropertyDetails } from "@shared/types/models";

const logger = createChildLogger(baseLogger, {
  module: "listing-property-service"
});

const PERPLEXITY_PROPERTY_SCHEMA: PerplexityResponseFormat = {
  type: "json_schema",
  json_schema: {
    name: "property_details",
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "address",
        "property_type",
        "year_built",
        "living_area_sq_ft",
        "bedrooms",
        "bathrooms_full",
        "lot_size_acres",
        "architecture",
        "exterior_features",
        "interior_features",
        "basement",
        "garage",
        "hoa",
        "sale_history",
        "valuation_estimates",
        "location_context",
        "sources"
      ],
      properties: {
        address: { type: ["string", "null"] },
        property_type: { type: ["string", "null"] },
        year_built: { type: ["number", "null"] },
        living_area_sq_ft: { type: ["number", "null"] },
        bedrooms: { type: ["number", "null"] },
        bathrooms_full: { type: ["number", "null"] },
        lot_size_acres: { type: ["number", "null"] },
        architecture: { type: ["string", "null"] },
        exterior_features: {
          type: ["object", "null"],
          additionalProperties: false,
          properties: {
            materials: { type: ["array", "null"], items: { type: "string" } },
            front_porch: { type: ["boolean", "null"] },
            rear_deck: { type: ["boolean", "null"] },
            other_features: {
              type: ["array", "null"],
              items: { type: "string" }
            }
          }
        },
        interior_features: {
          type: ["object", "null"],
          additionalProperties: false,
          properties: {
            flooring_main_level: { type: ["string", "null"] },
            fireplace: { type: ["boolean", "null"] },
            kitchen: {
              type: ["object", "null"],
              additionalProperties: false,
              properties: {
                countertops: { type: ["string", "null"] },
                pantry: { type: ["boolean", "null"] },
                open_to_family_room: { type: ["boolean", "null"] },
                breakfast_area: { type: ["boolean", "null"] }
              }
            },
            rooms_main_level: {
              type: ["array", "null"],
              items: { type: "string" }
            },
            laundry_room: { type: ["string", "null"] },
            bedroom_layout: {
              type: ["object", "null"],
              additionalProperties: false,
              properties: {
                upper_level_bedrooms: { type: ["number", "null"] },
                fourth_bedroom_or_bonus: { type: ["boolean", "null"] }
              }
            },
            primary_bedroom: {
              type: ["object", "null"],
              additionalProperties: false,
              properties: {
                level: { type: ["string", "null"] },
                approx_size: { type: ["string", "null"] },
                features: {
                  type: ["array", "null"],
                  items: { type: "string" }
                }
              }
            }
          }
        },
        basement: {
          type: ["object", "null"],
          additionalProperties: false,
          properties: {
            type: { type: ["string", "null"] },
            finished: { type: ["boolean", "null"] }
          }
        },
        garage: {
          type: ["object", "null"],
          additionalProperties: false,
          properties: {
            car_capacity: { type: ["number", "null"] },
            location: { type: ["string", "null"] }
          }
        },
        hoa: {
          type: ["object", "null"],
          additionalProperties: false,
          properties: {
            has_hoa: { type: ["boolean", "null"] },
            monthly_fee_usd: { type: ["number", "null"] }
          }
        },
        sale_history: {
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
        },
        valuation_estimates: {
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
        },
        location_context: {
          type: ["object", "null"],
          additionalProperties: false,
          properties: {
            subdivision: { type: ["string", "null"] },
            street_type: { type: ["string", "null"] },
            county: { type: ["string", "null"] },
            state: { type: ["string", "null"] }
          }
        },
        sources: {
          type: ["array", "null"],
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              site: { type: ["string", "null"] },
              notes: { type: ["string", "null"] },
              citation: { type: ["string", "null"] }
            }
          }
        }
      }
    }
  }
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeString(value: unknown): string | null | undefined {
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeNumber(value: unknown): number | null | undefined {
  if (value === null) {
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function normalizeBoolean(value: unknown): boolean | null | undefined {
  if (value === null) {
    return null;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
  }
  return undefined;
}

function normalizeStringArray(value: unknown): string[] | null | undefined {
  if (value === null) {
    return null;
  }
  if (!Array.isArray(value)) {
    return undefined;
  }
  const normalized = value
    .map((entry) => normalizeString(entry))
    .filter((entry): entry is string => Boolean(entry));
  return normalized.length > 0 ? normalized : undefined;
}

function hasDefinedValues(value: Record<string, unknown>): boolean {
  return Object.values(value).some((entry) => entry !== undefined);
}

function parsePerplexityJson(raw: unknown): unknown | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw !== "string") {
    return raw;
  }
  try {
    return JSON.parse(raw);
  } catch {
    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace <= firstBrace) {
      return null;
    }
    try {
      return JSON.parse(raw.slice(firstBrace, lastBrace + 1));
    } catch {
      return null;
    }
  }
}

function normalizeListingPropertyDetails(
  raw: unknown,
  fallbackAddress?: string
): ListingPropertyDetails | null {
  if (!isRecord(raw)) {
    return null;
  }

  const address =
    normalizeString(raw.address) ??
    normalizeString(fallbackAddress ?? null);
  const propertyDetails: ListingPropertyDetails = {};

  if (address !== undefined) {
    propertyDetails.address = address;
  }

  const propertyType = normalizeString(raw.property_type);
  if (propertyType !== undefined) {
    propertyDetails.property_type = propertyType;
  }

  const yearBuilt = normalizeNumber(raw.year_built);
  if (yearBuilt !== undefined) {
    propertyDetails.year_built = yearBuilt;
  }

  const livingArea = normalizeNumber(raw.living_area_sq_ft);
  if (livingArea !== undefined) {
    propertyDetails.living_area_sq_ft = livingArea;
  }

  const bedrooms = normalizeNumber(raw.bedrooms);
  if (bedrooms !== undefined) {
    propertyDetails.bedrooms = bedrooms;
  }

  const bathroomsFull = normalizeNumber(raw.bathrooms_full);
  if (bathroomsFull !== undefined) {
    propertyDetails.bathrooms_full = bathroomsFull;
  }

  const lotSize = normalizeNumber(raw.lot_size_acres);
  if (lotSize !== undefined) {
    propertyDetails.lot_size_acres = lotSize;
  }

  const architecture = normalizeString(raw.architecture);
  if (architecture !== undefined) {
    propertyDetails.architecture = architecture;
  }

  if (raw.exterior_features === null) {
    propertyDetails.exterior_features = null;
  } else if (isRecord(raw.exterior_features)) {
    const exterior = {
      materials: normalizeStringArray(raw.exterior_features.materials),
      front_porch: normalizeBoolean(raw.exterior_features.front_porch),
      rear_deck: normalizeBoolean(raw.exterior_features.rear_deck),
      other_features: normalizeStringArray(
        raw.exterior_features.other_features
      )
    };
    if (hasDefinedValues(exterior)) {
      propertyDetails.exterior_features = exterior;
    }
  }

  if (raw.interior_features === null) {
    propertyDetails.interior_features = null;
  } else if (isRecord(raw.interior_features)) {
    const kitchenValue = raw.interior_features.kitchen;
    const kitchen =
      kitchenValue === null
        ? null
        : isRecord(kitchenValue)
          ? {
              countertops: normalizeString(kitchenValue.countertops),
              pantry: normalizeBoolean(kitchenValue.pantry),
              open_to_family_room: normalizeBoolean(
                kitchenValue.open_to_family_room
              ),
              breakfast_area: normalizeBoolean(kitchenValue.breakfast_area)
            }
          : undefined;

    const bedroomLayoutValue = raw.interior_features.bedroom_layout;
    const bedroomLayout =
      bedroomLayoutValue === null
        ? null
        : isRecord(bedroomLayoutValue)
          ? {
              upper_level_bedrooms: normalizeNumber(
                bedroomLayoutValue.upper_level_bedrooms
              ),
              fourth_bedroom_or_bonus: normalizeBoolean(
                bedroomLayoutValue.fourth_bedroom_or_bonus
              )
            }
          : undefined;

    const primaryBedroomValue = raw.interior_features.primary_bedroom;
    const primaryBedroom =
      primaryBedroomValue === null
        ? null
        : isRecord(primaryBedroomValue)
          ? {
              level: normalizeString(primaryBedroomValue.level),
              approx_size: normalizeString(primaryBedroomValue.approx_size),
              features: normalizeStringArray(primaryBedroomValue.features)
            }
          : undefined;

    const interior = {
      flooring_main_level: normalizeString(
        raw.interior_features.flooring_main_level
      ),
      fireplace: normalizeBoolean(raw.interior_features.fireplace),
      kitchen,
      rooms_main_level: normalizeStringArray(
        raw.interior_features.rooms_main_level
      ),
      laundry_room: normalizeString(raw.interior_features.laundry_room),
      bedroom_layout: bedroomLayout,
      primary_bedroom: primaryBedroom
    };

    if (hasDefinedValues(interior)) {
      propertyDetails.interior_features = interior;
    }
  }

  if (raw.basement === null) {
    propertyDetails.basement = null;
  } else if (isRecord(raw.basement)) {
    const basement = {
      type: normalizeString(raw.basement.type),
      finished: normalizeBoolean(raw.basement.finished)
    };
    if (hasDefinedValues(basement)) {
      propertyDetails.basement = basement;
    }
  }

  if (raw.garage === null) {
    propertyDetails.garage = null;
  } else if (isRecord(raw.garage)) {
    const garage = {
      car_capacity: normalizeNumber(raw.garage.car_capacity),
      location: normalizeString(raw.garage.location)
    };
    if (hasDefinedValues(garage)) {
      propertyDetails.garage = garage;
    }
  }

  if (raw.hoa === null) {
    propertyDetails.hoa = null;
  } else if (isRecord(raw.hoa)) {
    const hoa = {
      has_hoa: normalizeBoolean(raw.hoa.has_hoa),
      monthly_fee_usd: normalizeNumber(raw.hoa.monthly_fee_usd)
    };
    if (hasDefinedValues(hoa)) {
      propertyDetails.hoa = hoa;
    }
  }

  const saleHistoryRaw = raw.sale_history;
  if (saleHistoryRaw === null) {
    propertyDetails.sale_history = null;
  } else if (Array.isArray(saleHistoryRaw)) {
    const saleHistory = saleHistoryRaw
      .map((entry) => {
        if (!isRecord(entry)) {
          return null;
        }
        const item = {
          event: normalizeString(entry.event),
          close_date: normalizeString(entry.close_date),
          sale_price_usd: normalizeNumber(entry.sale_price_usd),
          price_per_sq_ft_usd: normalizeNumber(entry.price_per_sq_ft_usd),
          list_to_sale_percent_change: normalizeNumber(
            entry.list_to_sale_percent_change
          ),
          list_price_usd: normalizeNumber(entry.list_price_usd)
        };
        return hasDefinedValues(item) ? item : null;
      })
      .filter((entry) => entry !== null);
    propertyDetails.sale_history = saleHistory.length > 0 ? saleHistory : null;
  }

  if (raw.valuation_estimates === null) {
    propertyDetails.valuation_estimates = null;
  } else if (isRecord(raw.valuation_estimates)) {
    const examplesRaw = raw.valuation_estimates.third_party_examples;
    const examples =
      examplesRaw === null
        ? null
        : Array.isArray(examplesRaw)
          ? examplesRaw
              .map((entry) => {
                if (!isRecord(entry)) {
                  return null;
                }
                const item = {
                  provider: normalizeString(entry.provider),
                  value_usd: normalizeNumber(entry.value_usd)
                };
                return hasDefinedValues(item) ? item : null;
              })
              .filter((entry) => entry !== null)
          : undefined;

    const valuation = {
      range_low_usd: normalizeNumber(raw.valuation_estimates.range_low_usd),
      range_high_usd: normalizeNumber(raw.valuation_estimates.range_high_usd),
      third_party_examples: examples
    };
    if (hasDefinedValues(valuation)) {
      propertyDetails.valuation_estimates = valuation;
    }
  }

  if (raw.location_context === null) {
    propertyDetails.location_context = null;
  } else if (isRecord(raw.location_context)) {
    const location = {
      subdivision: normalizeString(raw.location_context.subdivision),
      street_type: normalizeString(raw.location_context.street_type),
      county: normalizeString(raw.location_context.county),
      state: normalizeString(raw.location_context.state)
    };
    if (hasDefinedValues(location)) {
      propertyDetails.location_context = location;
    }
  }

  const sourcesRaw = raw.sources;
  if (sourcesRaw === null) {
    propertyDetails.sources = null;
  } else if (Array.isArray(sourcesRaw)) {
    const sources = sourcesRaw
      .map((entry) => {
        if (!isRecord(entry)) {
          return null;
        }
        const item = {
          site: normalizeString(entry.site),
          notes: normalizeString(entry.notes),
          citation: normalizeString(entry.citation)
        };
        return hasDefinedValues(item) ? item : null;
      })
      .filter((entry) => entry !== null);
    propertyDetails.sources = sources.length > 0 ? sources : null;
  }

  return hasDefinedValues(propertyDetails) ? propertyDetails : null;
}

export function buildPropertyDetailsRevision(
  details: ListingPropertyDetails
): string {
  return createHash("sha256").update(JSON.stringify(details)).digest("hex");
}

export async function fetchPropertyDetailsFromPerplexity(
  address: string
): Promise<ListingPropertyDetails | null> {
  if (!address || address.trim() === "") {
    throw new Error("Address is required to fetch property details");
  }

  const system = [
    "You are a real estate property data researcher.",
    "Return only JSON that matches the provided schema.",
    "Use public IDX, tax assessor, and listing records when available.",
    "Focus on details helpful for marketing short-form videos, posts, and captions.",
    "Do not include tax/assessment breakdowns, APN/MLS identifiers, or listing status fields.",
    "If a field is unknown, set it to null. Do not fabricate."
  ].join(" ");

  const user = [
    `Property address: ${address}.`,
    "Provide property details in the schema.",
    "Use US units (sq ft, acres, USD).",
    "Exclude tax assessments, APN/MLS identifiers, and listing status info.",
    "Include sources in the sources array where possible."
  ].join("\n");

  const response = await requestPerplexity({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    response_format: PERPLEXITY_PROPERTY_SCHEMA
  });

  if (!response?.choices?.length) {
    logger.warn({ address }, "Perplexity property response empty");
    return null;
  }

  const content = response.choices[0]?.message?.content;
  const parsed = parsePerplexityJson(content);
  const normalized = normalizeListingPropertyDetails(parsed, address);

  if (!normalized) {
    logger.warn({ address }, "Perplexity property response invalid");
  }

  return normalized;
}
