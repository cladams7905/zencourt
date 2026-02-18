import { URL as NodeURL } from "node:url";

const mockFetchWithTimeout = jest.fn();

jest.mock("../http", () => ({
  fetchWithTimeout: (...args: unknown[]) => mockFetchWithTimeout(...args)
}));

import { getFredSeriesLatestValue } from "../fred";

describe("marketData/providers/fred", () => {
  const logger = { warn: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as { URL: typeof URL }).URL = NodeURL as unknown as typeof URL;
  });

  it("returns null when API key is missing", async () => {
    await expect(
      getFredSeriesLatestValue({
        seriesId: "MORTGAGE30US",
        apiKey: null,
        fetcher: jest.fn() as never,
        logger,
        timeoutMs: 1000
      })
    ).resolves.toBeNull();
    expect(mockFetchWithTimeout).not.toHaveBeenCalled();
  });

  it("returns null when request throws", async () => {
    mockFetchWithTimeout.mockRejectedValue(new Error("network down"));

    await expect(
      getFredSeriesLatestValue({
        seriesId: "MORTGAGE30US",
        apiKey: "fred-key",
        fetcher: jest.fn() as never,
        logger,
        timeoutMs: 1000
      })
    ).resolves.toBeNull();
    expect(logger.warn).toHaveBeenCalled();
  });

  it("returns null on non-ok response", async () => {
    mockFetchWithTimeout.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "error"
    });

    await expect(
      getFredSeriesLatestValue({
        seriesId: "MORTGAGE30US",
        apiKey: "fred-key",
        fetcher: jest.fn() as never,
        logger,
        timeoutMs: 1000
      })
    ).resolves.toBeNull();
    expect(logger.warn).toHaveBeenCalled();
  });

  it("returns parsed observation value when available", async () => {
    mockFetchWithTimeout.mockResolvedValue({
      ok: true,
      json: async () => ({
        observations: [{ value: "6.75" }]
      })
    });

    await expect(
      getFredSeriesLatestValue({
        seriesId: "MORTGAGE30US",
        apiKey: "fred-key",
        fetcher: jest.fn() as never,
        logger,
        timeoutMs: 1000
      })
    ).resolves.toBe(6.75);
  });
});
