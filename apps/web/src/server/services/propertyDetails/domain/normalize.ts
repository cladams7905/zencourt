import type { ListingPropertyDetails } from "@shared/types/models";
import {
  isRecord,
  normalizeNullableString as normalizeString,
  normalizeNullableNumber as normalizeNumber,
  normalizeNullableStringArray as normalizeStringArray
} from "@web/src/server/utils/normalization";
import type { ListingPropertyRaw } from "./parsing";

function hasDefinedValues(value: Record<string, unknown>): boolean {
  return Object.values(value).some((entry) => entry !== undefined);
}

function normalizeDropdownValue(value: unknown): string | null | undefined {
  const normalized = normalizeString(value);
  if (typeof normalized === "string" && normalized.toLowerCase() === "other") {
    return null;
  }
  return normalized;
}

function normalizeExteriorFeatures(
  raw: Record<string, unknown>
): ListingPropertyDetails["exterior_features"] | undefined {
  if (raw.exterior_features === null) {
    return null;
  }
  if (!isRecord(raw.exterior_features)) {
    return undefined;
  }

  const exterior = {
    materials: normalizeStringArray(raw.exterior_features.materials),
    highlights: normalizeStringArray(raw.exterior_features.highlights)
  };
  return hasDefinedValues(exterior) ? exterior : undefined;
}

function normalizeInteriorFeatures(
  raw: Record<string, unknown>
): ListingPropertyDetails["interior_features"] | undefined {
  if (raw.interior_features === null) {
    return null;
  }
  if (!isRecord(raw.interior_features)) {
    return undefined;
  }

  const kitchenValue = raw.interior_features.kitchen;
  const kitchen =
    kitchenValue === null
      ? null
      : isRecord(kitchenValue)
        ? {
            features: normalizeStringArray(kitchenValue.features)
          }
        : undefined;

  const primarySuiteValue = raw.interior_features.primary_suite;
  const primarySuite =
    primarySuiteValue === null
      ? null
      : isRecord(primarySuiteValue)
        ? {
            features: normalizeStringArray(primarySuiteValue.features)
          }
        : undefined;

  const interior = {
    kitchen,
    primary_suite: primarySuite
  };

  return hasDefinedValues(interior) ? interior : undefined;
}

function normalizeSaleHistory(
  raw: Record<string, unknown>
): ListingPropertyDetails["sale_history"] | undefined {
  const saleHistoryRaw = raw.sale_history;
  if (saleHistoryRaw === null) {
    return null;
  }
  if (!Array.isArray(saleHistoryRaw)) {
    return undefined;
  }

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

  return saleHistory.length > 0 ? saleHistory : null;
}

/**
 * Normalizes open house time strings to HH:mm (24h).
 * When AM/PM is not present, infers based on typical open house hours:
 * - 7:00–11:59 → AM (morning)
 * - 12:00–6:59 → PM (noon through early evening)
 */
function normalizeOpenHouseTime(
  value: string | null | undefined
): string | null | undefined {
  const trimmed = typeof value === "string" ? value.trim() : null;
  if (!trimmed) return value === null ? null : undefined;

  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return trimmed;

  let hour = parseInt(match[1], 10);
  const minute = Math.min(59, Math.max(0, parseInt(match[2], 10) || 0));
  const ampm = match[3]?.toUpperCase();

  if (ampm === "AM" || ampm === "PM") {
    if (ampm === "AM" && hour === 12) hour = 0;
    else if (ampm === "PM" && hour !== 12) hour += 12;
  } else {
    if (hour >= 1 && hour <= 6) {
      hour += 12;
    } else if (hour === 12) {
      hour = 12;
    }
  }

  const h = Math.max(0, Math.min(23, hour));
  const m = minute;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function normalizeOpenHouseEvents(
  raw: Record<string, unknown>
): ListingPropertyDetails["open_house_events"] | undefined {
  const openHouseEventsRaw = raw.open_house_events;
  if (openHouseEventsRaw === null) {
    return null;
  }
  if (!Array.isArray(openHouseEventsRaw)) {
    return undefined;
  }

  const openHouseEvents = openHouseEventsRaw
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }
      const timeRange =
        normalizeString(entry.time_range) ??
        normalizeString(entry.timeRange) ??
        normalizeString(entry.time);
      const splitTimeRange = timeRange
        ? timeRange.split(/\s*[-\u2013\u2014]\s*/, 2).map((part) => part.trim())
        : null;
      const rawStart =
        normalizeString(entry.start_time) ??
        normalizeString(entry.startTime) ??
        normalizeString(entry.start) ??
        normalizeString(entry.starts_at) ??
        normalizeString(entry.startsAt) ??
        splitTimeRange?.[0];
      const rawEnd =
        normalizeString(entry.end_time) ??
        normalizeString(entry.endTime) ??
        normalizeString(entry.end) ??
        normalizeString(entry.ends_at) ??
        normalizeString(entry.endsAt) ??
        splitTimeRange?.[1];

      const item = {
        date:
          normalizeString(entry.date) ??
          normalizeString(entry.event_date) ??
          normalizeString(entry.eventDate),
        start_time:
          rawStart !== undefined ? normalizeOpenHouseTime(rawStart) : rawStart,
        end_time: rawEnd !== undefined ? normalizeOpenHouseTime(rawEnd) : rawEnd
      };
      return hasDefinedValues(item) ? item : null;
    })
    .filter((entry) => entry !== null);

  return openHouseEvents.length > 0 ? openHouseEvents : null;
}

function normalizeValuationEstimates(
  raw: Record<string, unknown>
): ListingPropertyDetails["valuation_estimates"] | undefined {
  if (raw.valuation_estimates === null) {
    return null;
  }
  if (!isRecord(raw.valuation_estimates)) {
    return undefined;
  }

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

  return hasDefinedValues(valuation) ? valuation : undefined;
}

function normalizeLocationContext(
  raw: Record<string, unknown>
): ListingPropertyDetails["location_context"] | undefined {
  if (raw.location_context === null) {
    return null;
  }
  if (!isRecord(raw.location_context)) {
    return undefined;
  }

  const location = {
    subdivision: normalizeString(raw.location_context.subdivision),
    street_type: normalizeDropdownValue(raw.location_context.street_type),
    lot_type: normalizeDropdownValue(raw.location_context.lot_type),
    county: normalizeString(raw.location_context.county),
    state: normalizeString(raw.location_context.state)
  };

  return hasDefinedValues(location) ? location : undefined;
}

function normalizeSources(
  raw: Record<string, unknown>
): ListingPropertyDetails["sources"] | undefined {
  const sourcesRaw = raw.sources;
  if (sourcesRaw === null) {
    return null;
  }
  if (!Array.isArray(sourcesRaw)) {
    return undefined;
  }

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

  return sources.length > 0 ? sources : null;
}

export function normalizeListingPropertyDetails(
  raw: ListingPropertyRaw,
  fallbackAddress?: string
): ListingPropertyDetails | null {
  const address =
    normalizeString(raw.address) ?? normalizeString(fallbackAddress ?? null);
  const propertyDetails: ListingPropertyDetails = {};

  if (address !== undefined) {
    propertyDetails.address = address;
  }

  const propertyType = normalizeDropdownValue(raw.property_type);
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

  const bathrooms = normalizeNumber(raw.bathrooms);
  if (bathrooms !== undefined) {
    propertyDetails.bathrooms = bathrooms;
  }

  const listingPrice = normalizeNumber(raw.listing_price);
  if (listingPrice !== undefined) {
    propertyDetails.listing_price = listingPrice;
  }

  const lotSize = normalizeNumber(raw.lot_size_acres);
  if (lotSize !== undefined) {
    propertyDetails.lot_size_acres = lotSize;
  }

  const stories = normalizeNumber(raw.stories);
  if (stories !== undefined) {
    propertyDetails.stories = stories;
  }

  const architecture = normalizeDropdownValue(raw.architecture);
  if (architecture !== undefined) {
    propertyDetails.architecture = architecture;
  }

  const exterior = normalizeExteriorFeatures(raw);
  if (exterior !== undefined) {
    propertyDetails.exterior_features = exterior;
  }

  const interior = normalizeInteriorFeatures(raw);
  if (interior !== undefined) {
    propertyDetails.interior_features = interior;
  }

  const livingSpaces = normalizeStringArray(raw.living_spaces);
  if (livingSpaces !== undefined) {
    propertyDetails.living_spaces = livingSpaces;
  }

  const additionalSpaces = normalizeStringArray(raw.additional_spaces);
  if (additionalSpaces !== undefined) {
    propertyDetails.additional_spaces = additionalSpaces;
  }

  const openHouseEvents = normalizeOpenHouseEvents(raw);
  if (openHouseEvents !== undefined) {
    propertyDetails.open_house_events = openHouseEvents;
  }

  const saleHistory = normalizeSaleHistory(raw);
  if (saleHistory !== undefined) {
    propertyDetails.sale_history = saleHistory;
  }

  const valuationEstimates = normalizeValuationEstimates(raw);
  if (valuationEstimates !== undefined) {
    propertyDetails.valuation_estimates = valuationEstimates;
  }

  const locationContext = normalizeLocationContext(raw);
  if (locationContext !== undefined) {
    propertyDetails.location_context = locationContext;
  }

  const sources = normalizeSources(raw);
  if (sources !== undefined) {
    propertyDetails.sources = sources;
  }

  return hasDefinedValues(propertyDetails) ? propertyDetails : null;
}
