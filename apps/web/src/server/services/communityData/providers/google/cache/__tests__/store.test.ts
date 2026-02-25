const mockGetSharedRedisClient = jest.fn();

jest.mock("@web/src/server/cache/redis", () => ({
  getSharedRedisClient: (...args: unknown[]) =>
    mockGetSharedRedisClient(...args)
}));

import { createCommunityCache } from "@web/src/server/services/communityData/providers/google/cache/store";

describe("google cache store", () => {
  const logger = { info: jest.fn(), warn: jest.fn() };

  beforeEach(() => {
    mockGetSharedRedisClient.mockReset();
    logger.info.mockReset();
    logger.warn.mockReset();
  });

  it("returns null/noop when redis client unavailable", async () => {
    mockGetSharedRedisClient.mockReturnValue(null);
    const cache = createCommunityCache(logger);

    await expect(cache.getCachedCommunityData("78701")).resolves.toBeNull();
    await expect(
      cache.getCachedCityDescription("Austin", "TX")
    ).resolves.toBeNull();
    await expect(
      cache.getCachedCommunityCategoryList("78701", "dining")
    ).resolves.toBeNull();
    await expect(cache.getCachedSeasonalSections("78701")).resolves.toBeNull();
    await expect(cache.getCachedPlaceDetails("p1")).resolves.toBeNull();
    await expect(
      cache.getCachedAudienceDelta("78701", "growing_families")
    ).resolves.toBeNull();
    await expect(
      cache.getCachedPlacePool("78701", "dining")
    ).resolves.toBeNull();
    await expect(
      cache.setCachedCommunityData("78701", {} as never)
    ).resolves.toBeUndefined();
    await expect(
      cache.setCachedCityDescription("Austin", "TX", { description: "x" })
    ).resolves.toBeUndefined();
    await expect(
      cache.setCachedCommunityCategoryList("78701", "dining", "- D1")
    ).resolves.toBeUndefined();
    await expect(
      cache.setCachedSeasonalSections("78701", { spring: "- item" })
    ).resolves.toBeUndefined();
    await expect(
      cache.setCachedPlaceDetails("p1", {} as never)
    ).resolves.toBeUndefined();
    await expect(
      cache.setCachedAudienceDelta("78701", "growing_families", {
        dining: "- D1"
      })
    ).resolves.toBeUndefined();
    await expect(
      cache.setCachedPlacePool("78701", "dining", [
        { placeId: "p1", sourceQueries: undefined }
      ])
    ).resolves.toBeUndefined();
  });

  it("reads/writes cache payloads when redis is available", async () => {
    const redis = {
      get: jest
        .fn()
        .mockResolvedValueOnce({ city: "Austin" })
        .mockResolvedValueOnce("- D1"),
      set: jest.fn().mockResolvedValue(undefined)
    };
    mockGetSharedRedisClient.mockReturnValue(redis);

    const cache = createCommunityCache(logger);

    await expect(cache.getCachedCommunityData("78701")).resolves.toEqual({
      city: "Austin"
    });
    await expect(
      cache.getCachedCommunityCategoryList("78701", "dining")
    ).resolves.toBe("- D1");

    await cache.setCachedCommunityData("78701", { city: "Austin" } as never);
    await cache.setCachedCommunityCategoryList("78701", "dining", "- D1");
    await cache.setCachedSeasonalSections("78701", { spring: "- item" });

    expect(redis.get).toHaveBeenCalled();
    expect(redis.set).toHaveBeenCalled();
  });

  it("handles redis errors and logs warnings", async () => {
    const redis = {
      get: jest.fn().mockRejectedValue(new Error("boom")),
      set: jest.fn().mockRejectedValue(new Error("boom"))
    };
    mockGetSharedRedisClient.mockReturnValue(redis);

    const cache = createCommunityCache(logger);

    await expect(cache.getCachedPlaceDetails("p1")).resolves.toBeNull();
    await expect(cache.getCachedCommunityData("78701")).resolves.toBeNull();
    await expect(
      cache.getCachedCityDescription("Austin", "TX")
    ).resolves.toBeNull();
    await expect(
      cache.getCachedCommunityCategoryList("78701", "dining")
    ).resolves.toBeNull();
    await expect(cache.getCachedSeasonalSections("78701")).resolves.toBeNull();
    await expect(
      cache.getCachedAudienceDelta("78701", "growing_families")
    ).resolves.toBeNull();
    await expect(
      cache.getCachedPlacePool("78701", "dining")
    ).resolves.toBeNull();
    await expect(
      cache.setCachedPlaceDetails("p1", {} as never)
    ).resolves.toBeUndefined();
    await expect(
      cache.setCachedCommunityData("78701", {} as never)
    ).resolves.toBeUndefined();
    await expect(
      cache.setCachedCityDescription("Austin", "TX", { description: "x" })
    ).resolves.toBeUndefined();
    await expect(
      cache.setCachedCommunityCategoryList("78701", "dining", "- D1")
    ).resolves.toBeUndefined();
    await expect(
      cache.setCachedSeasonalSections("78701", { spring: "- item" })
    ).resolves.toBeUndefined();
    await expect(
      cache.setCachedAudienceDelta("78701", "growing_families", {
        dining: "- D1"
      })
    ).resolves.toBeUndefined();
    await expect(
      cache.setCachedPlacePool("78701", "dining", [
        { placeId: "p1", sourceQueries: undefined }
      ])
    ).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalled();
  });

  it("supports remaining cache methods", async () => {
    const redis = {
      get: jest
        .fn()
        .mockResolvedValueOnce({ spring: "- item" })
        .mockResolvedValueOnce({ id: "p1" })
        .mockResolvedValueOnce({ dining: "- D1" })
        .mockResolvedValueOnce({
          items: [{ placeId: "p1", sourceQueries: undefined }]
        }),
      set: jest.fn().mockResolvedValue(undefined)
    };
    mockGetSharedRedisClient.mockReturnValue(redis);

    const cache = createCommunityCache(logger);

    await expect(cache.getCachedSeasonalSections("78701")).resolves.toEqual({
      spring: "- item"
    });
    await expect(cache.getCachedPlaceDetails("p1")).resolves.toEqual({
      id: "p1"
    });
    await expect(
      cache.getCachedAudienceDelta("78701", "growing_families")
    ).resolves.toEqual({
      dining: "- D1"
    });
    await expect(cache.getCachedPlacePool("78701", "dining")).resolves.toEqual({
      items: [{ placeId: "p1" }]
    });

    await cache.setCachedPlaceDetails("p1", { id: "p1" } as never);
    await cache.setCachedAudienceDelta(
      "78701",
      "growing_families",
      { dining: "- D1" },
      ["Austin,TX"]
    );
    await cache.setCachedPlacePool(
      "78701",
      "dining",
      [{ placeId: "p1", sourceQueries: undefined }],
      "growing_families"
    );

    expect(redis.set).toHaveBeenCalled();
    expect(cache.isPoolStale(new Date().toISOString())).toBe(false);
  });

  it("returns null from getters when redis returns null", async () => {
    const redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined)
    };
    mockGetSharedRedisClient.mockReturnValue(redis);
    const cache = createCommunityCache(logger);

    await expect(cache.getCachedCommunityData("78701")).resolves.toBeNull();
    await expect(
      cache.getCachedCommunityCategoryList("78701", "dining")
    ).resolves.toBeNull();
    await expect(cache.getCachedSeasonalSections("78701")).resolves.toBeNull();
    await expect(cache.getCachedPlaceDetails("p1")).resolves.toBeNull();
    await expect(
      cache.getCachedAudienceDelta("78701", "growing_families")
    ).resolves.toBeNull();
    await expect(
      cache.getCachedPlacePool("78701", "dining")
    ).resolves.toBeNull();
  });

  it("handles errors across remaining getters/setters", async () => {
    const redis = {
      get: jest.fn().mockRejectedValue(new Error("boom")),
      set: jest.fn().mockRejectedValue(new Error("boom"))
    };
    mockGetSharedRedisClient.mockReturnValue(redis);
    const cache = createCommunityCache(logger);

    await expect(cache.getCachedSeasonalSections("78701")).resolves.toBeNull();
    await expect(
      cache.getCachedAudienceDelta("78701", "growing_families")
    ).resolves.toBeNull();
    await expect(
      cache.getCachedPlacePool("78701", "dining")
    ).resolves.toBeNull();

    await expect(
      cache.setCachedSeasonalSections("78701", { spring: "- item" })
    ).resolves.toBeUndefined();
    await expect(
      cache.setCachedAudienceDelta("78701", "growing_families", {
        dining: "- D1"
      })
    ).resolves.toBeUndefined();
    await expect(
      cache.setCachedPlacePool("78701", "dining", [
        { placeId: "p1", sourceQueries: undefined }
      ])
    ).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalled();
  });
});
