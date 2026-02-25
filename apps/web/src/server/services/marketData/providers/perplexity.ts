import {
  type PerplexityMessage,
  type PerplexityResponseFormat
} from "@web/src/server/services/_integrations/perplexity";
import type {
  MarketData,
  MarketLocation,
  PerplexityMarketPayload
} from "../types";
import { sanitizeMarketField, NOT_AVAILABLE } from "../domain/transforms";
import { buildSummary } from "../domain/summary";

const PERPLEXITY_MARKET_SCHEMA: PerplexityResponseFormat = {
  type: "json_schema",
  json_schema: {
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "data_timestamp",
        "median_home_price",
        "price_change_yoy",
        "active_listings",
        "months_of_supply",
        "avg_dom",
        "sale_to_list_ratio",
        "median_rent",
        "rent_change_yoy",
        "rate_30yr",
        "estimated_monthly_payment",
        "median_household_income",
        "affordability_index",
        "entry_level_price",
        "entry_level_payment",
        "market_summary"
      ],
      properties: {
        data_timestamp: { type: ["string", "null"] },
        median_home_price: { type: ["string", "null"] },
        price_change_yoy: { type: ["string", "null"] },
        active_listings: { type: ["string", "null"] },
        months_of_supply: { type: ["string", "null"] },
        avg_dom: { type: ["string", "null"] },
        sale_to_list_ratio: { type: ["string", "null"] },
        median_rent: { type: ["string", "null"] },
        rent_change_yoy: { type: ["string", "null"] },
        rate_30yr: { type: ["string", "null"] },
        estimated_monthly_payment: { type: ["string", "null"] },
        median_household_income: { type: ["string", "null"] },
        affordability_index: { type: ["string", "null"] },
        entry_level_price: { type: ["string", "null"] },
        entry_level_payment: { type: ["string", "null"] },
        market_summary: { type: ["string", "null"] }
      }
    }
  }
};

function buildPerplexityMarketMessages(
  location: MarketLocation
): PerplexityMessage[] {
  const system = [
    "You are a real estate market data researcher.",
    "Return only JSON that matches the provided schema.",
    "Use the most recent data available and be conservative with estimates.",
    "If a field is unknown, set it to null. Do not fabricate."
  ].join(" ");

  const user = [
    `Location: ${location.city}, ${location.state} ${location.zip_code}.`,
    "Provide a concise market snapshot with the fields in the schema.",
    "Use US dollars and percentages where relevant (e.g., $413,000, 2.8%).",
    "Keep market_summary to 1-2 sentences.",
    "Avoid overly confident forecasts or guarantees."
  ].join("\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user }
  ];
}

type LoggerLike = {
  warn: (obj: unknown, msg?: string) => void;
};

type Clock = () => Date;

type PerplexityTextRunner = (args: {
  messages: PerplexityMessage[];
  responseFormat: PerplexityResponseFormat;
  maxTokens?: number;
}) => Promise<unknown | null>;

export async function fetchPerplexityMarketData(
  location: MarketLocation,
  deps: {
    logger: LoggerLike;
    now: Clock;
    runStructuredMarketQuery: PerplexityTextRunner;
  }
): Promise<MarketData | null> {
  const responseRaw = await deps.runStructuredMarketQuery({
    messages: buildPerplexityMarketMessages(location),
    responseFormat: PERPLEXITY_MARKET_SCHEMA,
    maxTokens: 900
  });
  const response = responseRaw as
    | {
        choices?: Array<{ message?: { content?: string } }>;
        search_results?: Array<{
          title?: string;
          url?: string;
          source?: string;
          date?: string;
        }>;
      }
    | undefined;

  const raw = response?.choices?.[0]?.message?.content;
  if (!raw) {
    return null;
  }

  let payload: PerplexityMarketPayload | null = null;
  try {
    payload = JSON.parse(raw) as PerplexityMarketPayload;
  } catch (error) {
    deps.logger.warn(
      { error: error instanceof Error ? error.message : String(error) },
      "Failed to parse Perplexity market JSON"
    );
    return null;
  }

  const narrativeField = sanitizeMarketField(payload?.market_summary);
  const medianHomePrice = sanitizeMarketField(payload?.median_home_price);
  const priceChange = sanitizeMarketField(payload?.price_change_yoy);
  const inventory = sanitizeMarketField(payload?.active_listings);
  const monthsSupply = sanitizeMarketField(payload?.months_of_supply);

  const { summary } = buildSummary(
    location,
    medianHomePrice,
    priceChange,
    inventory,
    monthsSupply
  );

  const dataTimestamp =
    typeof payload?.data_timestamp === "string" &&
    payload.data_timestamp.trim() !== ""
      ? payload.data_timestamp.trim()
      : deps.now().toISOString();

  return {
    city: location.city,
    state: location.state,
    zip_code: location.zip_code,
    data_timestamp: dataTimestamp,
    median_home_price: medianHomePrice,
    price_change_yoy: priceChange,
    active_listings: inventory,
    months_of_supply: monthsSupply,
    avg_dom: sanitizeMarketField(payload?.avg_dom),
    sale_to_list_ratio: sanitizeMarketField(payload?.sale_to_list_ratio),
    median_rent: sanitizeMarketField(payload?.median_rent),
    rent_change_yoy: sanitizeMarketField(payload?.rent_change_yoy),
    rate_30yr: sanitizeMarketField(payload?.rate_30yr),
    estimated_monthly_payment: sanitizeMarketField(
      payload?.estimated_monthly_payment
    ),
    median_household_income: sanitizeMarketField(
      payload?.median_household_income
    ),
    affordability_index: sanitizeMarketField(payload?.affordability_index),
    entry_level_price: sanitizeMarketField(payload?.entry_level_price),
    entry_level_payment: sanitizeMarketField(payload?.entry_level_payment),
    market_summary: narrativeField !== NOT_AVAILABLE ? narrativeField : summary,
    citations: (response?.search_results ?? [])
      .map((result) => ({
        title: result.title,
        url: result.url,
        source: result.source ?? result.date
      }))
      .filter((item) => item.title || item.url || item.source)
  };
}
