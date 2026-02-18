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

function normalizeExteriorFeatures(raw: Record<string, unknown>): ListingPropertyDetails["exterior_features"] | undefined {
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

function normalizeInteriorFeatures(raw: Record<string, unknown>): ListingPropertyDetails["interior_features"] | undefined {
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

function normalizeSaleHistory(raw: Record<string, unknown>): ListingPropertyDetails["sale_history"] | undefined {
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
        list_to_sale_percent_change: normalizeNumber(entry.list_to_sale_percent_change),
        list_price_usd: normalizeNumber(entry.list_price_usd)
      };
      return hasDefinedValues(item) ? item : null;
    })
    .filter((entry) => entry !== null);

  return saleHistory.length > 0 ? saleHistory : null;
}

function normalizeValuationEstimates(raw: Record<string, unknown>): ListingPropertyDetails["valuation_estimates"] | undefined {
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

function normalizeLocationContext(raw: Record<string, unknown>): ListingPropertyDetails["location_context"] | undefined {
  if (raw.location_context === null) {
    return null;
  }
  if (!isRecord(raw.location_context)) {
    return undefined;
  }

  const location = {
    subdivision: normalizeString(raw.location_context.subdivision),
    street_type: normalizeString(raw.location_context.street_type),
    lot_type: normalizeString(raw.location_context.lot_type),
    county: normalizeString(raw.location_context.county),
    state: normalizeString(raw.location_context.state)
  };

  return hasDefinedValues(location) ? location : undefined;
}

function normalizeSources(raw: Record<string, unknown>): ListingPropertyDetails["sources"] | undefined {
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
  const address = normalizeString(raw.address) ?? normalizeString(fallbackAddress ?? null);
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

  const architecture = normalizeString(raw.architecture);
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
