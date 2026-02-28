import type { ListingPropertyDetails } from "@shared/types/models";
import type { MarketDataInput } from "./types";
import type { ListingOpenHouseContext } from "@web/src/lib/domain/listings/openHouse";
import {
  readPromptFile,
  LISTING_SUBCATEGORY_DIRECTIVE_FILES
} from "./promptFileCache";
import { hasMeaningfulValue, normalizeListingSubcategory } from "./promptHelpers";

const LISTING_PROMPT_DROPPED_KEYS = new Set([
  "sources",
  "sale_history",
  "valuation_estimates"
]);

export function buildMarketDataXml(data: MarketDataInput): string {
  const location = `${data.city}, ${data.state}`;
  const fields: Array<[string, string | null | undefined]> = [
    ["summary", data.market_summary],
    ["median_home_price", data.median_home_price],
    ["price_change_yoy", data.price_change_yoy],
    ["active_listings", data.active_listings],
    ["months_of_supply", data.months_of_supply],
    ["avg_dom", data.avg_dom],
    ["sale_to_list_ratio", data.sale_to_list_ratio],
    ["median_rent", data.median_rent],
    ["rent_change_yoy", data.rent_change_yoy],
    ["rate_30yr", data.rate_30yr],
    ["estimated_monthly_payment", data.estimated_monthly_payment],
    ["median_household_income", data.median_household_income],
    ["affordability_index", data.affordability_index],
    ["entry_level_price", data.entry_level_price],
    ["entry_level_payment", data.entry_level_payment]
  ];

  const lines = fields
    .filter(([, value]) => hasMeaningfulValue(value))
    .map(([key, value]) => `${key}: ${value}`);

  return [
    `<market_data location="${location}" zip_code="${data.zip_code}" as_of="${data.data_timestamp}">`,
    ...lines,
    "</market_data>"
  ].join("\n");
}

export function buildListingDataXml(
  listingPropertyDetails?: ListingPropertyDetails | null
): string {
  if (!listingPropertyDetails) {
    return [
      "<listing_data>",
      "No structured listing details were provided. Do not invent property facts.",
      "</listing_data>"
    ].join("\n");
  }

  const sanitizeValue = (value: unknown): unknown | undefined => {
    if (value === null || value === undefined) {
      return undefined;
    }

    if (Array.isArray(value)) {
      const cleaned = value
        .map((entry) => sanitizeValue(entry))
        .filter((entry) => entry !== undefined);
      return cleaned.length > 0 ? cleaned : undefined;
    }

    if (typeof value === "object") {
      const record = value as Record<string, unknown>;
      const cleanedEntries = Object.entries(record)
        .filter(([key]) => !LISTING_PROMPT_DROPPED_KEYS.has(key))
        .map(
          ([key, entry]) =>
            [key, sanitizeValue(entry)] as [string, unknown | undefined]
        )
        .filter(([, entry]) => entry !== undefined);

      if (cleanedEntries.length === 0) {
        return undefined;
      }

      return Object.fromEntries(cleanedEntries);
    }

    return value;
  };

  const sanitizedListingData = sanitizeValue(listingPropertyDetails) as
    | Record<string, unknown>
    | undefined;

  if (!sanitizedListingData) {
    return [
      "<listing_data>",
      "No structured listing details were provided. Do not invent property facts.",
      "</listing_data>"
    ].join("\n");
  }

  return [
    "<listing_data>",
    "```json",
    JSON.stringify(sanitizedListingData, null, 2),
    "```",
    "</listing_data>"
  ].join("\n");
}

export async function loadListingSubcategoryDirective(
  subcategory?: string | null
): Promise<string> {
  const normalized = normalizeListingSubcategory(subcategory);
  if (!normalized) {
    return "";
  }

  const file = LISTING_SUBCATEGORY_DIRECTIVE_FILES[normalized];
  return readPromptFile(file);
}

export function buildOpenHouseContextXml(
  context?: ListingOpenHouseContext | null
): string {
  if (!context) {
    return [
      "<open_house_context>",
      "No open-house context is available.",
      "</open_house_context>"
    ].join("\n");
  }

  const lines = [
    "<open_house_context>",
    `has_any_event: ${context.hasAnyEvent ? "true" : "false"}`,
    `has_schedule: ${context.hasSchedule ? "true" : "false"}`,
    `open_house_date_time_label: ${context.openHouseDateTimeLabel || "(none)"}`,
    `open_house_overlay_label: ${context.openHouseOverlayLabel || "(none)"}`,
    `listing_address_line: ${context.listingAddressLine || "(none)"}`
  ];

  if (context.selectedEvent) {
    lines.push(
      "selected_event:",
      `  date: ${context.selectedEvent.date || "(none)"}`,
      `  start_time: ${context.selectedEvent.startTime || "(none)"}`,
      `  end_time: ${context.selectedEvent.endTime || "(none)"}`,
      `  date_label: ${context.selectedEvent.dateLabel || "(none)"}`,
      `  time_label: ${context.selectedEvent.timeLabel || "(none)"}`,
      `  date_time_label: ${context.selectedEvent.dateTimeLabel || "(none)"}`
    );
  } else {
    lines.push("selected_event: (none)");
  }

  lines.push("</open_house_context>");
  return lines.join("\n");
}
