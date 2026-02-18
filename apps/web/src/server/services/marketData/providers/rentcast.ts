import type { MarketData, MarketLocation } from "../types";
import {
  formatCount,
  formatCurrency,
  formatPercent,
  getRentalData,
  getSaleData,
  normalizePayload,
  pickNumber,
  NOT_AVAILABLE
} from "../domain/transforms";
import {
  computeYoYChange,
  extractHistoryMap,
  getLatestHistoryKey,
  pickTimestamp
} from "../domain/history";
import { buildSummary } from "../domain/summary";
import { getFredSeriesLatestValue } from "./fred";
import { fetchWithTimeout } from "./http";
import { parseRentCastMarketResponse } from "./parsers";

const RENTCAST_API_URL = "https://api.rentcast.io/v1/markets";
const RENTCAST_DATA_TYPE = "All";
const RENTCAST_HISTORY_RANGE = "6";

const DEFAULT_FRED_MORTGAGE_SERIES = "MORTGAGE30US";
const DEFAULT_FRED_INCOME_SERIES = "MEHOINUSA672N";

type LoggerLike = {
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
};

export async function fetchRentCastMarketData(params: {
  location: MarketLocation;
  rentCastApiKey: string | null;
  fredApiKey: string | null;
  fetcher: typeof fetch;
  now: () => Date;
  logger: LoggerLike;
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
  fredTimeoutMs: number;
}): Promise<MarketData | null> {
  if (!params.rentCastApiKey) {
    return null;
  }

  const url = new URL(RENTCAST_API_URL);
  url.searchParams.set("zipCode", params.location.zip_code);
  url.searchParams.set("dataType", RENTCAST_DATA_TYPE);
  url.searchParams.set("historyRange", RENTCAST_HISTORY_RANGE);

  let response: Response;
  try {
    response = await fetchWithTimeout(
      params.fetcher,
      url,
      {
        method: "GET",
        headers: {
          accept: "application/json",
          "X-Api-Key": params.rentCastApiKey
        }
      },
      params.timeoutMs
    );
  } catch (error) {
    params.logger.error({ error }, "RentCast request failed");
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    params.logger.error(
      { status: response.status, errorText },
      "RentCast request failed"
    );
    return null;
  }

  const payload = normalizePayload(
    parseRentCastMarketResponse(await response.json())
  );
  const saleData = getSaleData(payload);
  const rentalData = getRentalData(payload);
  const saleHistory = extractHistoryMap(saleData);
  const rentalHistory = extractHistoryMap(rentalData);
  const timestamp = pickTimestamp(saleData, rentalData, params.now);
  const latestSaleHistoryKey = getLatestHistoryKey(saleHistory, timestamp);
  const latestRentalHistoryKey = getLatestHistoryKey(rentalHistory, timestamp);

  const medianHomePrice = pickNumber(saleData, ["medianPrice"]);
  const priceChangeYoy = computeYoYChange(
    saleHistory,
    latestSaleHistoryKey,
    "medianPrice"
  );
  const activeListings = pickNumber(saleData, ["totalListings"]);
  const monthsOfSupply = pickNumber(saleData, ["monthsOfSupply"]);
  const avgDom = pickNumber(saleData, ["averageDaysOnMarket", "medianDaysOnMarket"]);
  const saleToListRatio = pickNumber(saleData, ["saleToListRatio"]);
  const medianRent = pickNumber(rentalData, ["medianRent"]);
  const rentChangeYoy = computeYoYChange(
    rentalHistory,
    latestRentalHistoryKey,
    "medianRent"
  );
  const entryLevelPrice = pickNumber(saleData, ["percentile25Price"]);

  const mortgageSeries = params.env.FRED_MORTGAGE_SERIES ?? DEFAULT_FRED_MORTGAGE_SERIES;
  const incomeSeries = params.env.FRED_INCOME_SERIES ?? DEFAULT_FRED_INCOME_SERIES;

  const [mortgageRate, medianIncome] = await Promise.all([
    getFredSeriesLatestValue({
      seriesId: mortgageSeries,
      apiKey: params.fredApiKey,
      fetcher: params.fetcher,
      logger: params.logger,
      timeoutMs: params.fredTimeoutMs
    }),
    getFredSeriesLatestValue({
      seriesId: incomeSeries,
      apiKey: params.fredApiKey,
      fetcher: params.fetcher,
      logger: params.logger,
      timeoutMs: params.fredTimeoutMs
    })
  ]);

  const formattedMedianPrice = formatCurrency(medianHomePrice);
  const formattedPriceChange = formatPercent(priceChangeYoy);
  const formattedActiveListings = formatCount(activeListings);
  const formattedMonthsSupply =
    monthsOfSupply === null ? NOT_AVAILABLE : `${monthsOfSupply.toFixed(1)} months`;
  const formattedAvgDom = avgDom === null ? NOT_AVAILABLE : `${avgDom.toFixed(0)} days`;
  const formattedSaleToList = formatPercent(saleToListRatio);
  const formattedMedianRent = formatCurrency(medianRent);
  const formattedRentChange = formatPercent(rentChangeYoy);
  const formattedEntryLevelPrice = formatCurrency(entryLevelPrice);
  const formattedMortgageRate = formatPercent(mortgageRate);
  const formattedMedianIncome = formatCurrency(medianIncome);

  const { summary } = buildSummary(
    params.location,
    formattedMedianPrice,
    formattedPriceChange,
    formattedActiveListings,
    formattedMonthsSupply
  );

  return {
    city: params.location.city,
    state: params.location.state,
    zip_code: params.location.zip_code,
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
}
