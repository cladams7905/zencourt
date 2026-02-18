import type { MarketData, MarketLocation } from "@web/src/lib/domain/market/types";

export type { MarketData, MarketLocation };

export type RentCastMarketResponse = Record<string, unknown> | Array<unknown>;

export type RentCastMarketPayload = {
  saleData?: Record<string, unknown> | null;
  rentalData?: Record<string, unknown> | null;
};

export type PerplexityMarketPayload = {
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

export type FredObservationResponse = {
  observations?: Array<Record<string, unknown>>;
};
