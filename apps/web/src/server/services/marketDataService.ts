import type { MarketData, MarketLocation } from "@web/src/types/market";
import { createChildLogger, logger as baseLogger } from "@web/src/lib/logger";
import { Redis } from "@upstash/redis";
import { requestPerplexity } from "./community/perplexity/client";
import type {
  PerplexityMessage,
  PerplexityResponseFormat
} from "./community/perplexity/types";

const logger = createChildLogger(baseLogger, {
  module: "market-data-service"
});

const RENTCAST_API_URL = "https://api.rentcast.io/v1/markets";
const FRED_API_URL = "https://api.stlouisfed.org/fred/series/observations";
const RENTCAST_DATA_TYPE = "All";
const RENTCAST_HISTORY_RANGE = "6";
const NOT_AVAILABLE = "N/A";
const MARKET_DATA_PROVIDER =
  process.env.MARKET_DATA_PROVIDER?.toLowerCase() ?? "perplexity";
const RENTCAST_CACHE_KEY_PREFIX = "rentcast";
const PERPLEXITY_CACHE_KEY_PREFIX = "market:perplexity";
const DEFAULT_RENTCAST_TTL_DAYS = 30;
const DEFAULT_PERPLEXITY_TTL_DAYS = 30;
const DEFAULT_FRED_MORTGAGE_SERIES = "MORTGAGE30US";
const DEFAULT_FRED_INCOME_SERIES = "MEHOINUSA672N";

let redisClient: Redis | null | undefined;

type RentCastMarketResponse = Record<string, unknown> | Array<unknown>;

type RentCastMarketPayload = {
  saleData?: Record<string, unknown> | null;
  rentalData?: Record<string, unknown> | null;
  id?: string | null;
  zipCode?: string | null;
};

type PerplexityMarketPayload = {
  data_timestamp?: string | null;
  median_home_price?: string | null;
  price_change_yoy?: string | null;
  active_listings?: string | null;
  months_of_supply?: string | null;
  avg_dom?: string | null;
  sale_to_list_ratio?: string | null;
  median_rent?: string | null;
  rent_change_yoy?: string | null;
  rate_30yr?: string | null;
  estimated_monthly_payment?: string | null;
  median_household_income?: string | null;
  affordability_index?: string | null;
  entry_level_price?: string | null;
  entry_level_payment?: string | null;
  market_summary?: string | null;
};

const US_ZIP_REGEX = /\b\d{5}(?:-\d{4})?\b/;

export function parseMarketLocation(
  location: string | null | undefined
): MarketLocation | null {
  if (!location) {
    return null;
  }

  const zipMatch = location.match(US_ZIP_REGEX);
  const zip_code = zipMatch?.[0] ?? "";

  const [cityPart, restPart] = location.split(",");
  const city = cityPart?.trim() ?? "";
  const restTokens = (restPart ?? "").trim().split(/\s+/);
  const state = restTokens[0] ?? "";

  if (!city || !state || !zip_code) {
    return null;
  }

  return { city, state, zip_code };
}

function getRentCastApiKey(): string | null {
  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) {
    logger.warn("RENTCAST_API_KEY is not configured");
    return null;
  }
  return apiKey;
}

function getFredApiKey(): string | null {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    logger.warn("FRED_API_KEY is not configured");
    return null;
  }
  return apiKey;
}

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) {
    return redisClient;
  }

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    logger.warn(
      { hasUrl: Boolean(url), hasToken: Boolean(token) },
      "Upstash Redis env vars missing; cache disabled"
    );
    redisClient = null;
    return redisClient;
  }

  redisClient = new Redis({ url, token });
  logger.info("Upstash Redis client initialized (market data)");
  return redisClient;
}

function getRentCastCacheKey(zipCode: string): string {
  return `${RENTCAST_CACHE_KEY_PREFIX}:${zipCode}`;
}

function getPerplexityCacheKey(zipCode: string): string {
  return `${PERPLEXITY_CACHE_KEY_PREFIX}:${zipCode}`;
}

function getRentCastCacheTtlSeconds(): number {
  const override = process.env.RENTCAST_CACHE_TTL_DAYS;
  if (!override) {
    return DEFAULT_RENTCAST_TTL_DAYS * 24 * 60 * 60;
  }

  const parsed = Number.parseInt(override, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_RENTCAST_TTL_DAYS * 24 * 60 * 60;
  }

  return parsed * 24 * 60 * 60;
}

function getPerplexityCacheTtlSeconds(): number {
  const override = process.env.MARKET_DATA_CACHE_TTL_DAYS;
  if (!override) {
    return DEFAULT_PERPLEXITY_TTL_DAYS * 24 * 60 * 60;
  }

  const parsed = Number.parseInt(override, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_PERPLEXITY_TTL_DAYS * 24 * 60 * 60;
  }

  return parsed * 24 * 60 * 60;
}

function pickNumber(
  source: Record<string, unknown>,
  keys: string[]
): number | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value.replace(/[^0-9.-]/g, ""));
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function pickObservationValue(
  observation: Record<string, unknown>
): number | null {
  const value = observation.value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function formatCurrency(value: number | null): string {
  if (value === null) {
    return NOT_AVAILABLE;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function formatPercent(value: number | null): string {
  if (value === null) {
    return NOT_AVAILABLE;
  }
  const normalized = Math.abs(value) <= 1 ? value * 100 : value;
  return `${normalized.toFixed(1)}%`;
}

function formatCount(value: number | null): string {
  if (value === null) {
    return NOT_AVAILABLE;
  }
  return new Intl.NumberFormat("en-US").format(value);
}

function normalizePayload(
  payload: RentCastMarketResponse
): RentCastMarketPayload {
  if (Array.isArray(payload)) {
    return (payload[0] as RentCastMarketPayload) ?? {};
  }

  if (payload && typeof payload === "object") {
    return payload as RentCastMarketPayload;
  }

  return {};
}

function getMarketDataProvider(): "perplexity" | "rentcast" {
  return MARKET_DATA_PROVIDER === "rentcast" ? "rentcast" : "perplexity";
}

function sanitizeMarketField(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : NOT_AVAILABLE;
  }
  if (value === null || value === undefined) {
    return NOT_AVAILABLE;
  }
  return String(value);
}

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

function getSaleData(payload: RentCastMarketPayload): Record<string, unknown> {
  const saleData = payload.saleData;
  if (saleData && typeof saleData === "object") {
    return saleData;
  }
  return {};
}

function getRentalData(
  payload: RentCastMarketPayload
): Record<string, unknown> {
  const rentalData = payload.rentalData;
  if (rentalData && typeof rentalData === "object") {
    return rentalData;
  }
  return {};
}

function pickTimestamp(
  saleData: Record<string, unknown>,
  rentalData: Record<string, unknown>
): string {
  const saleTimestamp = saleData.lastUpdatedDate;
  if (typeof saleTimestamp === "string" && saleTimestamp.trim() !== "") {
    return saleTimestamp;
  }

  const rentalTimestamp = rentalData.lastUpdatedDate;
  if (typeof rentalTimestamp === "string" && rentalTimestamp.trim() !== "") {
    return rentalTimestamp;
  }

  return new Date().toISOString();
}

function extractHistoryMap(
  source: Record<string, unknown>
): Record<string, Record<string, unknown>> {
  const history = source.history;
  if (!history || typeof history !== "object") {
    return {};
  }
  return history as Record<string, Record<string, unknown>>;
}

function getLatestHistoryKey(
  history: Record<string, Record<string, unknown>>,
  fallbackDate: string
): string | null {
  const parsed = new Date(fallbackDate);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getUTCFullYear();
    const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }

  const keys = Object.keys(history);
  if (keys.length === 0) {
    return null;
  }
  return keys.sort().at(-1) ?? null;
}

function getPriorYearKey(latestKey: string): string | null {
  const match = latestKey.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return null;
  }
  const year = Number.parseInt(match[1], 10);
  const month = match[2];
  if (!Number.isFinite(year)) {
    return null;
  }
  return `${year - 1}-${month}`;
}

function computeYoYChange(
  history: Record<string, Record<string, unknown>>,
  latestKey: string | null,
  valueKey: string
): number | null {
  if (!latestKey) {
    return null;
  }

  const priorKey = getPriorYearKey(latestKey);
  if (!priorKey) {
    return null;
  }

  const latestEntry = history[latestKey] ?? {};
  const priorEntry = history[priorKey] ?? {};

  const latestValue = pickNumber(latestEntry, [valueKey]);
  const priorValue = pickNumber(priorEntry, [valueKey]);

  if (latestValue === null || priorValue === null || priorValue === 0) {
    return null;
  }

  return (latestValue - priorValue) / priorValue;
}

type FredObservationResponse = {
  observations?: Array<Record<string, unknown>>;
};

async function getFredSeriesLatestValue(seriesId: string): Promise<number | null> {
  const apiKey = getFredApiKey();
  if (!apiKey) {
    return null;
  }

  const url = new URL(FRED_API_URL);
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("limit", "1");

  let response: Response;
  try {
    response = await fetch(url, { method: "GET" });
  } catch (error) {
    logger.warn(
      { error, seriesId },
      "FRED request failed"
    );
    return null;
  }
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    logger.warn(
      { status: response.status, errorText, seriesId },
      "FRED request failed"
    );
    return null;
  }

  const payload = (await response.json()) as FredObservationResponse;
  const observation = payload.observations?.[0];
  if (!observation || typeof observation !== "object") {
    return null;
  }

  const value = pickObservationValue(observation);
  if (value === null) {
    return null;
  }

  return value;
}

function buildSummary(
  location: MarketLocation,
  medianPrice: string,
  priceChange: string,
  inventory: string,
  monthsSupply: string
): { summary: string; } {
  const summaryParts: string[] = [];

  if (medianPrice !== NOT_AVAILABLE && priceChange !== NOT_AVAILABLE) {
    summaryParts.push(
      `${location.city} home prices are around ${medianPrice}, with ${priceChange} year-over-year movement.`
    );
  } else {
    summaryParts.push(
      `Market snapshot for ${location.city}, ${location.state}.`
    );
  }

  if (inventory !== NOT_AVAILABLE && monthsSupply !== NOT_AVAILABLE) {
    summaryParts.push(
      `Inventory sits near ${monthsSupply} months with about ${inventory} active listings.`
    );
  }

  const summary = summaryParts.join(" ");

  return { summary };
}

async function getPerplexityMarketData(
  location: MarketLocation
): Promise<MarketData | null> {
  const redis = getRedisClient();
  const cacheKey = getPerplexityCacheKey(location.zip_code);
  if (redis) {
    try {
      const cached = await redis.get<MarketData>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      logger.warn({ error }, "Failed to read Perplexity market cache");
    }
  }

  const response = await requestPerplexity({
    messages: buildPerplexityMarketMessages(location),
    response_format: PERPLEXITY_MARKET_SCHEMA,
    max_tokens: 900
  });

  const raw = response?.choices?.[0]?.message?.content;
  if (!raw) {
    return null;
  }

  let payload: PerplexityMarketPayload | null = null;
  try {
    payload = JSON.parse(raw) as PerplexityMarketPayload;
  } catch (error) {
    logger.warn(
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
      : new Date().toISOString();

  const normalized: MarketData = {
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
    market_summary:
      narrativeField !== NOT_AVAILABLE ? narrativeField : summary,
    citations: (response?.search_results ?? [])
    .map((result) => ({
      title: result.title,
      url: result.url,
      source: result.source ?? result.date
    }))
    .filter((item) => item.title || item.url || item.source)
  };

  if (redis) {
    try {
      await redis.set(cacheKey, normalized, {
        ex: getPerplexityCacheTtlSeconds()
      });
    } catch (error) {
      logger.warn({ error }, "Failed to write Perplexity market cache");
    }
  }

  return normalized;
}

export async function getRentCastMarketData(
  location: MarketLocation
): Promise<MarketData | null> {
  const apiKey = getRentCastApiKey();
  if (!apiKey) {
    return null;
  }

  const redis = getRedisClient();
  const cacheKey = getRentCastCacheKey(location.zip_code);
  if (redis) {
    try {
      const cached = await redis.get<MarketData>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      logger.warn({ error }, "Failed to read RentCast cache");
    }
  }

  const url = new URL(RENTCAST_API_URL);
  url.searchParams.set("zipCode", location.zip_code);
  url.searchParams.set("dataType", RENTCAST_DATA_TYPE);
  url.searchParams.set("historyRange", RENTCAST_HISTORY_RANGE);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      "X-Api-Key": apiKey
    }
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    logger.error(
      { status: response.status, errorText },
      "RentCast request failed"
    );
    throw new Error("RentCast request failed");
  }

  const payload = normalizePayload(
    (await response.json()) as RentCastMarketResponse
  );
  const saleData = getSaleData(payload);
  const rentalData = getRentalData(payload);
  const saleHistory = extractHistoryMap(saleData);
  const rentalHistory = extractHistoryMap(rentalData);
  const timestamp = pickTimestamp(saleData, rentalData);
  const latestHistoryKey = getLatestHistoryKey(saleHistory, timestamp);

  const medianHomePrice = pickNumber(saleData, ["medianPrice"]);
  const priceChangeYoy = computeYoYChange(
    saleHistory,
    latestHistoryKey,
    "medianPrice"
  );
  const activeListings = pickNumber(saleData, ["totalListings"]);
  const monthsOfSupply = pickNumber(saleData, ["monthsOfSupply"]);
  const avgDom = pickNumber(saleData, [
    "averageDaysOnMarket",
    "medianDaysOnMarket"
  ]);
  const saleToListRatio = pickNumber(saleData, ["saleToListRatio"]);
  const medianRent = pickNumber(rentalData, ["medianRent"]);
  const rentChangeYoy = computeYoYChange(
    rentalHistory,
    latestHistoryKey,
    "medianRent"
  );
  const entryLevelPrice = pickNumber(saleData, ["percentile25Price"]);

  const mortgageSeries =
    process.env.FRED_MORTGAGE_SERIES ?? DEFAULT_FRED_MORTGAGE_SERIES;
  const incomeSeries =
    process.env.FRED_INCOME_SERIES ?? DEFAULT_FRED_INCOME_SERIES;

  const [mortgageRate, medianIncome] = await Promise.all([
    getFredSeriesLatestValue(mortgageSeries),
    getFredSeriesLatestValue(incomeSeries)
  ]);

  const formattedMedianPrice = formatCurrency(medianHomePrice);
  const formattedPriceChange = formatPercent(priceChangeYoy);
  const formattedActiveListings = formatCount(activeListings);
  const formattedMonthsSupply =
    monthsOfSupply === null
      ? NOT_AVAILABLE
      : `${monthsOfSupply.toFixed(1)} months`;
  const formattedAvgDom =
    avgDom === null ? NOT_AVAILABLE : `${avgDom.toFixed(0)} days`;
  const formattedSaleToList = formatPercent(saleToListRatio);
  const formattedMedianRent = formatCurrency(medianRent);
  const formattedRentChange = formatPercent(rentChangeYoy);
  const formattedEntryLevelPrice = formatCurrency(entryLevelPrice);
  const formattedMortgageRate = formatPercent(mortgageRate);
  const formattedMedianIncome = formatCurrency(medianIncome);

  const { summary } = buildSummary(
    location,
    formattedMedianPrice,
    formattedPriceChange,
    formattedActiveListings,
    formattedMonthsSupply
  );

  const normalized: MarketData = {
    city: location.city,
    state: location.state,
    zip_code: location.zip_code,
    data_timestamp: timestamp,
    median_home_price: formattedMedianPrice,
    price_change_yoy: formattedPriceChange,
    active_listings: formattedActiveListings,
    months_of_supply: formattedMonthsSupply,
    avg_dom: formattedAvgDom,
    sale_to_list_ratio: formattedSaleToList,
    median_rent: formattedMedianRent,
    rent_change_yoy: formattedRentChange,
    rate_30yr: formattedMortgageRate,
    estimated_monthly_payment: NOT_AVAILABLE,
    median_household_income: formattedMedianIncome,
    affordability_index: NOT_AVAILABLE,
    entry_level_price: formattedEntryLevelPrice,
    entry_level_payment: NOT_AVAILABLE,
    market_summary: summary,
    citations: undefined
  };

  if (redis) {
    try {
      await redis.set(cacheKey, normalized, {
        ex: getRentCastCacheTtlSeconds()
      });
    } catch (error) {
      logger.warn({ error }, "Failed to write RentCast cache");
    }
  }

  return normalized;
}

export async function getMarketData(
  location: MarketLocation
): Promise<MarketData | null> {
  const provider = getMarketDataProvider();
  if (provider === "rentcast") {
    return getRentCastMarketData(location);
  }

  const perplexityData = await getPerplexityMarketData(location);
  if (perplexityData) {
    return perplexityData;
  }

  logger.warn(
    { city: location.city, state: location.state, zip: location.zip_code },
    "Perplexity market data unavailable; falling back to RentCast"
  );
  return getRentCastMarketData(location);
}
