import { readMarketCache, writeMarketCache } from "../cache";

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
    const value = { data_timestamp: "2026-02-18T00:00:00.000Z" };
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
    const value = {
      data_timestamp: "2026-02-18T00:00:00.000Z"
    };

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
      value: { data_timestamp: "2026-02-18T00:00:00.000Z" },
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
