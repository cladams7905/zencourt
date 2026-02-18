import { URL as NodeURL } from "node:url";

const mockFetchWithTimeout = jest.fn();
const mockGetFredSeriesLatestValue = jest.fn();

jest.mock("../http", () => ({
  fetchWithTimeout: (...args: unknown[]) => mockFetchWithTimeout(...args)
}));

jest.mock("../fred", () => ({
  getFredSeriesLatestValue: (...args: unknown[]) =>
    mockGetFredSeriesLatestValue(...args)
}));

import { fetchRentCastMarketData } from "../rentcast";

describe("marketData/providers/rentcast", () => {
  const location = {
    city: "Austin",
    state: "TX",
    zip_code: "73301"
  };
  const logger = {
    warn: jest.fn(),
    error: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as { URL: typeof URL }).URL = NodeURL as unknown as typeof URL;
  });

  it("returns null when RentCast API key is missing", async () => {
    await expect(
      fetchRentCastMarketData({
        location,
        rentCastApiKey: null,
        fredApiKey: "fred-key",
        fetcher: jest.fn() as never,
        now: () => new Date("2026-02-18T00:00:00.000Z"),
        logger,
        env: {},
        timeoutMs: 1000,
        fredTimeoutMs: 1000
      })
    ).resolves.toBeNull();
  });

  it("returns null on fetch error", async () => {
    mockFetchWithTimeout.mockRejectedValue(new Error("network error"));

    await expect(
      fetchRentCastMarketData({
        location,
        rentCastApiKey: "rentcast-key",
        fredApiKey: "fred-key",
        fetcher: jest.fn() as never,
        now: () => new Date("2026-02-18T00:00:00.000Z"),
        logger,
        env: {},
        timeoutMs: 1000,
        fredTimeoutMs: 1000
      })
    ).resolves.toBeNull();
    expect(logger.error).toHaveBeenCalled();
  });

  it("returns null on non-ok response", async () => {
    mockFetchWithTimeout.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "bad request"
    });

    await expect(
      fetchRentCastMarketData({
        location,
        rentCastApiKey: "rentcast-key",
        fredApiKey: "fred-key",
        fetcher: jest.fn() as never,
        now: () => new Date("2026-02-18T00:00:00.000Z"),
        logger,
        env: {},
        timeoutMs: 1000,
        fredTimeoutMs: 1000
      })
    ).resolves.toBeNull();
  });

  it("maps successful payload into market data", async () => {
    mockFetchWithTimeout.mockResolvedValue({
      ok: true,
      json: async () => ({
        saleData: {
          medianPrice: 500000,
          totalListings: 120,
          monthsOfSupply: 2.4,
          averageDaysOnMarket: 35,
          saleToListRatio: 0.98,
          percentile25Price: 350000,
          lastUpdatedDate: "2026-02-01T00:00:00.000Z",
          history: {
            "2025-02": { medianPrice: 450000 },
            "2026-02": { medianPrice: 500000 }
          }
        },
        rentalData: {
          medianRent: 2600,
          history: {
            "2025-02": { medianRent: 2400 },
            "2026-02": { medianRent: 2600 }
          }
        }
      })
    });
    mockGetFredSeriesLatestValue
      .mockResolvedValueOnce(6.5)
      .mockResolvedValueOnce(95000);

    const result = await fetchRentCastMarketData({
      location,
      rentCastApiKey: "rentcast-key",
      fredApiKey: "fred-key",
      fetcher: jest.fn() as never,
      now: () => new Date("2026-02-18T00:00:00.000Z"),
      logger,
      env: {
        FRED_MORTGAGE_SERIES: "CUSTOM_MORT",
        FRED_INCOME_SERIES: "CUSTOM_INC"
      },
      timeoutMs: 1000,
      fredTimeoutMs: 2000
    });

    expect(result).toEqual(
      expect.objectContaining({
        median_home_price: "$500,000",
        price_change_yoy: "11.1%",
        active_listings: "120",
        months_of_supply: "2.4 months",
        avg_dom: "35 days",
        sale_to_list_ratio: "98.0%",
        median_rent: "$2,600",
        rent_change_yoy: "8.3%",
        rate_30yr: "6.5%",
        median_household_income: "$95,000",
        entry_level_price: "$350,000"
      })
    );

    expect(mockGetFredSeriesLatestValue).toHaveBeenCalledWith(
      expect.objectContaining({ seriesId: "CUSTOM_MORT", timeoutMs: 2000 })
    );
    expect(mockGetFredSeriesLatestValue).toHaveBeenCalledWith(
      expect.objectContaining({ seriesId: "CUSTOM_INC", timeoutMs: 2000 })
    );
  });
});
