import { readMarketCache, writeMarketCache } from "../cache";
import type { MarketData } from "../types";

function buildMarketData(partial: Partial<MarketData> = {}): MarketData {
  return {
    city: "Austin",
    state: "TX",
    zip_code: "73301",
    data_timestamp: "2026-02-18T00:00:00.000Z",
    median_home_price: "$500,000",
    price_change_yoy: "10.0%",
    active_listings: "100",
    months_of_supply: "2.0 months",
    avg_dom: "30 days",
    sale_to_list_ratio: "98.0%",
    median_rent: "$2,500",
    rent_change_yoy: "5.0%",
    rate_30yr: "6.5%",
    estimated_monthly_payment: "$3,000",
    median_household_income: "$90,000",
    affordability_index: "80",
    entry_level_price: "$350,000",
    entry_level_payment: "$2,400",
    market_summary: "Stable market",
    ...partial
  };
}

describe("marketData/cache", () => {
  it("returns null when redis is unavailable", async () => {
    const logger = { warn: jest.fn() };

    await expect(
      readMarketCache({
        redis: null,
        key: "market:94110",
        logger,
        errorMessage: "cache read failed"
      })
    ).resolves.toBeNull();
  });

  it("returns cached market data when read succeeds", async () => {
    const value = buildMarketData();
    const redis = {
      get: jest.fn().mockResolvedValue(value),
      set: jest.fn()
    };
    const logger = { warn: jest.fn() };

    await expect(
      readMarketCache({
        redis,
        key: "market:94110",
        logger,
        errorMessage: "cache read failed"
      })
    ).resolves.toEqual(value);
    expect(redis.get).toHaveBeenCalledWith("market:94110");
  });

  it("logs and returns null when read throws", async () => {
    const error = new Error("boom");
    const redis = {
      get: jest.fn().mockRejectedValue(error),
      set: jest.fn()
    };
    const logger = { warn: jest.fn() };

    await expect(
      readMarketCache({
        redis,
        key: "market:94110",
        logger,
        errorMessage: "cache read failed"
      })
    ).resolves.toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      { error, key: "market:94110" },
      "cache read failed"
    );
  });

  it("writes cache value with ttl", async () => {
    const redis = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue("OK")
    };
    const logger = { warn: jest.fn() };
    const value = buildMarketData();

    await writeMarketCache({
      redis,
      key: "market:94110",
      value,
      ttlSeconds: 60,
      logger,
      errorMessage: "cache write failed"
    });

    expect(redis.set).toHaveBeenCalledWith("market:94110", value, { ex: 60 });
  });

  it("logs and continues when write throws", async () => {
    const error = new Error("boom");
    const redis = {
      get: jest.fn(),
      set: jest.fn().mockRejectedValue(error)
    };
    const logger = { warn: jest.fn() };

    await writeMarketCache({
      redis,
      key: "market:94110",
      value: buildMarketData(),
      ttlSeconds: 30,
      logger,
      errorMessage: "cache write failed"
    });

    expect(logger.warn).toHaveBeenCalledWith(
      { error, key: "market:94110" },
      "cache write failed"
    );
  });
});
