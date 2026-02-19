const mockFetchPerplexityMarketData = jest.fn();
const mockFetchRentCastMarketData = jest.fn();

jest.mock("../providers/perplexity", () => ({
  fetchPerplexityMarketData: (...args: unknown[]) =>
    mockFetchPerplexityMarketData(...args)
}));

jest.mock("../providers/rentcast", () => ({
  fetchRentCastMarketData: (...args: unknown[]) =>
    mockFetchRentCastMarketData(...args)
}));

import { createMarketDataProviderRegistry } from "../registry";

describe("marketData/providerRegistry", () => {
  const baseDeps = {
    env: process.env,
    logger: { warn: jest.fn(), error: jest.fn() },
    fetcher: jest.fn() as unknown as typeof fetch,
    now: () => new Date("2026-02-19T00:00:00.000Z")
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("builds default provider chain as perplexity then rentcast", () => {
    const registry = createMarketDataProviderRegistry({
      ...baseDeps,
      env: { ...process.env }
    });

    expect(
      registry.getProviderChain().map((provider) => provider.name)
    ).toEqual(["perplexity", "rentcast"]);
  });

  it("builds rentcast-only chain when MARKET_DATA_PROVIDER=rentcast", () => {
    const registry = createMarketDataProviderRegistry({
      ...baseDeps,
      env: { ...process.env, MARKET_DATA_PROVIDER: "rentcast" }
    });

    expect(
      registry.getProviderChain().map((provider) => provider.name)
    ).toEqual(["rentcast"]);
  });

  it("routes rentcast provider calls with resolved API keys", async () => {
    mockFetchRentCastMarketData.mockResolvedValue({ market_summary: "ok" });
    const registry = createMarketDataProviderRegistry({
      ...baseDeps,
      env: {
        ...process.env,
        MARKET_DATA_PROVIDER: "rentcast",
        RENTCAST_API_KEY: "rent-key",
        FRED_API_KEY: "fred-key",
        RENTCAST_HTTP_TIMEOUT_MS: "9000",
        FRED_HTTP_TIMEOUT_MS: "8000"
      }
    });
    const provider = registry.getProvider("rentcast");

    await provider.getMarketData({
      city: "Austin",
      state: "TX",
      zip_code: "78701"
    });

    expect(mockFetchRentCastMarketData).toHaveBeenCalledWith(
      expect.objectContaining({
        rentCastApiKey: "rent-key",
        fredApiKey: "fred-key",
        timeoutMs: 9000,
        fredTimeoutMs: 8000
      })
    );
  });
});
