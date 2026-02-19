const mockFetchPerplexityMarketData = jest.fn();
const mockFetchRentCastMarketData = jest.fn();
const mockReadMarketCache = jest.fn();
const mockWriteMarketCache = jest.fn();
const mockRedisConstructor = jest.fn();

jest.mock("@upstash/redis", () => ({
  Redis: (...args: unknown[]) => mockRedisConstructor(...args)
}));

jest.mock("../providers/perplexity", () => ({
  fetchPerplexityMarketData: (...args: unknown[]) =>
    mockFetchPerplexityMarketData(...args)
}));

jest.mock("../providers/rentcast", () => ({
  fetchRentCastMarketData: (...args: unknown[]) =>
    mockFetchRentCastMarketData(...args)
}));

jest.mock("../cache", () => ({
  readMarketCache: (...args: unknown[]) => mockReadMarketCache(...args),
  writeMarketCache: (...args: unknown[]) => mockWriteMarketCache(...args)
}));

import { createMarketDataService } from "../service";

describe("marketData/service", () => {
  const location = { city: "Austin", state: "TX", zip_code: "73301" };
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
  const fetcher = jest.fn() as unknown as typeof fetch;
  const withEnv = (
    overrides: Record<string, string | undefined>
  ): NodeJS.ProcessEnv => ({
    ...process.env,
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockReadMarketCache.mockResolvedValue(null);
    mockWriteMarketCache.mockResolvedValue(undefined);
  });

  it("returns cached perplexity data without hitting provider", async () => {
    const cached = { market_summary: "cached" };
    mockReadMarketCache.mockResolvedValue(cached);

    const service = createMarketDataService({
      env: {
        ...withEnv({
          KV_REST_API_URL: "https://redis.example.com",
          KV_REST_API_TOKEN: "token"
        })
      },
      fetcher,
      logger,
      createRedisClient: () => ({ get: jest.fn(), set: jest.fn() })
    });

    await expect(service.getMarketData(location)).resolves.toEqual(cached);
    expect(mockFetchPerplexityMarketData).not.toHaveBeenCalled();
  });

  it("fetches perplexity data on cache miss and writes cache", async () => {
    const fresh = {
      city: "Austin",
      state: "TX",
      zip_code: "73301",
      data_timestamp: "2026-02-18T00:00:00.000Z",
      market_summary: "fresh"
    };
    mockFetchPerplexityMarketData.mockResolvedValue(fresh);

    const service = createMarketDataService({
      env: {
        ...withEnv({
          KV_REST_API_URL: "https://redis.example.com",
          KV_REST_API_TOKEN: "token"
        })
      },
      fetcher,
      logger,
      now: () => new Date("2026-02-18T00:00:00.000Z"),
      createRedisClient: () => ({ get: jest.fn(), set: jest.fn() })
    });

    await expect(service.getMarketData(location)).resolves.toEqual(fresh);
    expect(mockFetchPerplexityMarketData).toHaveBeenCalledTimes(1);
    expect(mockWriteMarketCache).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "market:perplexity:73301",
        ttlSeconds: 30 * 24 * 60 * 60
      })
    );
  });

  it("falls back to rentcast when perplexity has no data", async () => {
    const rentcast = { market_summary: "rentcast fallback" };
    mockFetchPerplexityMarketData.mockResolvedValue(null);
    mockFetchRentCastMarketData.mockResolvedValue(rentcast);

    const service = createMarketDataService({
      env: {
        ...withEnv({
          KV_REST_API_URL: "https://redis.example.com",
          KV_REST_API_TOKEN: "token"
        })
      },
      fetcher,
      logger,
      createRedisClient: () => ({ get: jest.fn(), set: jest.fn() })
    });

    await expect(service.getMarketData(location)).resolves.toEqual(rentcast);
    expect(mockFetchPerplexityMarketData).toHaveBeenCalledTimes(1);
    expect(mockFetchRentCastMarketData).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ zip: "73301" }),
      "Perplexity market data unavailable; falling back to RentCast"
    );
  });

  it("uses rentcast provider when explicitly configured", async () => {
    const rentcast = { market_summary: "rentcast configured" };
    mockFetchRentCastMarketData.mockResolvedValue(rentcast);

    const service = createMarketDataService({
      env: {
        ...withEnv({
          MARKET_DATA_PROVIDER: "rentcast"
        })
      },
      fetcher,
      logger
    });

    await expect(service.getMarketData(location)).resolves.toEqual(rentcast);
    expect(mockFetchPerplexityMarketData).not.toHaveBeenCalled();
    expect(mockFetchRentCastMarketData).toHaveBeenCalledTimes(1);
  });
});
