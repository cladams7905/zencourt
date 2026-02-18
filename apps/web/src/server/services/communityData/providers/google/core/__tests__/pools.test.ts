const mockGetCategoryDisplayLimit = jest.fn();
const mockGetCategoryPoolMax = jest.fn();

jest.mock("@web/src/server/services/communityData/config", () => ({
  getCategoryDisplayLimit: (...args: unknown[]) =>
    mockGetCategoryDisplayLimit(...args),
  getCategoryPoolMax: (...args: unknown[]) => mockGetCategoryPoolMax(...args)
}));

import { getPooledCategoryPlaces } from "@web/src/server/services/communityData/providers/google/core/pools";
import type { CommunityCache } from "@web/src/server/services/communityData/providers/google/cache";

describe("google pools", () => {
  const logger = { warn: jest.fn() };

  beforeEach(() => {
    mockGetCategoryDisplayLimit.mockReset();
    mockGetCategoryPoolMax.mockReset();
    logger.warn.mockReset();

    mockGetCategoryDisplayLimit.mockReturnValue(2);
    mockGetCategoryPoolMax.mockReturnValue(5);
  });

  it("returns cached pool when fresh", async () => {
    const cache = {
      getCachedPlacePool: jest.fn().mockResolvedValue({
        fetchedAt: new Date().toISOString(),
        items: [
          { placeId: "p1", sourceQueries: undefined },
          { placeId: "p2", sourceQueries: undefined }
        ]
      }),
      isPoolStale: jest.fn().mockReturnValue(false),
      setCachedPlacePool: jest.fn()
    };

    const fetchFn = jest.fn();
    const result = await getPooledCategoryPlaces(
      cache as unknown as CommunityCache,
      logger,
      { zipCode: "78701", category: "dining" },
      fetchFn
    );

    expect(result).toHaveLength(2);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("fetches and writes pool when cache is empty", async () => {
    const cache = {
      getCachedPlacePool: jest.fn().mockResolvedValue(null),
      isPoolStale: jest.fn(),
      setCachedPlacePool: jest.fn().mockResolvedValue(undefined)
    };

    const fetchFn = jest.fn().mockResolvedValue([
      {
        name: "Cafe A",
        placeId: "a",
        rating: 4.8,
        reviewCount: 100,
        address: "A",
        category: "dining"
      },
      {
        name: "Cafe B",
        placeId: "b",
        rating: 4.6,
        reviewCount: 90,
        address: "B",
        category: "dining"
      }
    ]);

    const result = await getPooledCategoryPlaces(
      cache as unknown as CommunityCache,
      logger,
      { zipCode: "78701", category: "dining" },
      fetchFn
    );

    expect(fetchFn).toHaveBeenCalled();
    expect(cache.setCachedPlacePool).toHaveBeenCalled();
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it("returns stale cached pool and refreshes asynchronously", async () => {
    const cache = {
      getCachedPlacePool: jest.fn().mockResolvedValue({
        fetchedAt: new Date().toISOString(),
        items: [
          { placeId: "p1", sourceQueries: undefined },
          { placeId: "p2", sourceQueries: undefined }
        ]
      }),
      isPoolStale: jest.fn().mockReturnValue(true),
      setCachedPlacePool: jest.fn().mockResolvedValue(undefined)
    };

    const fetchFn = jest
      .fn()
      .mockResolvedValue([
        {
          name: "Cafe A",
          placeId: "a",
          rating: 4.8,
          reviewCount: 100,
          address: "A",
          category: "dining"
        }
      ]);

    const result = await getPooledCategoryPlaces(
      cache as unknown as CommunityCache,
      logger,
      { zipCode: "78701", category: "dining" },
      fetchFn
    );

    expect(result).toHaveLength(2);
  });
});
