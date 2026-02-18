jest.mock("@web/src/server/services/communityData/config", () => ({
  COMMUNITY_CACHE_KEY_PREFIX: "community",
  shouldIncludeServiceAreasInCache: jest.fn(() => true)
}));

jest.mock("@web/src/server/services/communityData/shared/common", () => ({
  buildServiceAreasSignature: jest.fn(() => "sig"),
  getSecondsUntilEndOfMonth: jest.fn(() => 1000),
  slugify: jest.fn((v: string) => v.toLowerCase())
}));

jest.mock("@web/src/server/services/communityData/shared/redis", () => {
  const redis = {
    get: jest.fn(),
    set: jest.fn()
  };
  return {
    createRedisClientGetter: jest.fn(() => () => redis),
    __redis: redis
  };
});

jest.mock("@web/src/lib/core/logging/logger", () => ({
  logger: {},
  createChildLogger: jest.fn(() => ({ warn: jest.fn() }))
}));

import {
  getPerplexityCategoryCacheKey,
  getCachedPerplexityCategoryPayload,
  setCachedPerplexityCategoryPayload,
  getPerplexityMonthlyEventsCacheKey,
  getCachedPerplexityMonthlyEventsPayload,
  setCachedPerplexityMonthlyEventsPayload
} from "@web/src/server/services/communityData/providers/perplexity/cache";

describe("perplexity cache", () => {
  const configMock = jest.requireMock(
    "@web/src/server/services/communityData/config"
  );
  const commonMock = jest.requireMock(
    "@web/src/server/services/communityData/shared/common"
  );
  const redisMod = jest.requireMock(
    "@web/src/server/services/communityData/shared/redis"
  );
  const redis = redisMod.__redis;

  beforeEach(() => {
    configMock.shouldIncludeServiceAreasInCache.mockReset();
    commonMock.buildServiceAreasSignature.mockReset();
    commonMock.getSecondsUntilEndOfMonth.mockReset();
    commonMock.slugify.mockReset();
    redis.get.mockReset();
    redis.set.mockReset();

    configMock.shouldIncludeServiceAreasInCache.mockReturnValue(true);
    commonMock.buildServiceAreasSignature.mockReturnValue("sig");
    commonMock.getSecondsUntilEndOfMonth.mockReturnValue(1000);
    commonMock.slugify.mockImplementation((v: string) => v.toLowerCase());
  });

  it("builds category cache keys with city/state/audience/service areas", () => {
    const key = getPerplexityCategoryCacheKey({
      zipCode: "78701",
      category: "dining",
      audience: "growing_families" as never,
      serviceAreas: ["Austin, TX"],
      city: "Austin",
      state: "tx"
    });

    expect(key).toContain("community:perplexity:78701:TX:austin:cat:dining");
    expect(key).toContain(":aud:growing_families");
    expect(key).toContain(":sa:sig");
  });

  it("builds category key without service-area suffix when category opts out", () => {
    configMock.shouldIncludeServiceAreasInCache.mockReturnValueOnce(false);
    const key = getPerplexityCategoryCacheKey({
      zipCode: "78701",
      category: "education",
      serviceAreas: ["Austin, TX"]
    });
    expect(key).not.toContain(":sa:");
  });

  it("reads and writes category payloads", async () => {
    redis.get.mockResolvedValueOnce({ items: [{ name: "Cafe" }] });

    await expect(
      getCachedPerplexityCategoryPayload({
        zipCode: "78701",
        category: "dining" as never
      })
    ).resolves.toEqual({ items: [{ name: "Cafe" }] });

    await setCachedPerplexityCategoryPayload(
      { items: [{ name: "Cafe" }] } as never,
      { zipCode: "78701", category: "dining" as never }
    );

    expect(redis.set).toHaveBeenCalled();
  });

  it("returns null/noop when redis client is unavailable", async () => {
    const createRedisClientGetter =
      redisMod.createRedisClientGetter as jest.Mock;
    createRedisClientGetter.mockImplementationOnce(() => () => null);
    jest.resetModules();
    const mod =
      await import("@web/src/server/services/communityData/providers/perplexity/cache");

    await expect(
      mod.getCachedPerplexityCategoryPayload({
        zipCode: "78701",
        category: "dining" as never
      })
    ).resolves.toBeNull();
    await expect(
      mod.setCachedPerplexityCategoryPayload(
        { items: [{ name: "Cafe" }] } as never,
        { zipCode: "78701", category: "dining" as never }
      )
    ).resolves.toBeUndefined();
  });

  it("handles redis read/write failures gracefully", async () => {
    redis.get.mockRejectedValueOnce(new Error("boom"));
    redis.set.mockRejectedValueOnce(new Error("boom"));

    await expect(
      getCachedPerplexityCategoryPayload({
        zipCode: "78701",
        category: "dining" as never
      })
    ).resolves.toBeNull();
    await expect(
      setCachedPerplexityCategoryPayload(
        { items: [{ name: "Cafe" }] } as never,
        { zipCode: "78701", category: "dining" as never }
      )
    ).resolves.toBeUndefined();
  });

  it("builds monthly cache key and reads/writes payload", async () => {
    const key = getPerplexityMonthlyEventsCacheKey({
      zipCode: "78701",
      monthKey: "february",
      audience: "growing_families" as never,
      city: "Austin",
      state: "TX"
    });

    expect(key).toContain("things_to_do:february");

    redis.get.mockResolvedValueOnce({ items: [{ name: "Event" }] });
    await expect(
      getCachedPerplexityMonthlyEventsPayload({
        zipCode: "78701",
        monthKey: "february"
      })
    ).resolves.toEqual({ items: [{ name: "Event" }] });

    await setCachedPerplexityMonthlyEventsPayload(
      { items: [{ name: "Event" }] } as never,
      { zipCode: "78701", monthKey: "february" }
    );

    expect(redis.set).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      expect.objectContaining({ ex: 1000 })
    );
  });
});
