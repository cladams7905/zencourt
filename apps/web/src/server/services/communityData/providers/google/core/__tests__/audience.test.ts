const mockFetchScoredPlacesForQueries = jest.fn();
const mockGetSearchAnchors = jest.fn();
const mockFormatPlaceList = jest.fn();
const mockDedupePlaces = jest.fn();
const mockHydratePlacesFromItems = jest.fn();
const mockGetPooledCategoryPlaces = jest.fn();
const mockBuildSeasonalQueries = jest.fn();
const mockEstimateSearchCallsForQueries = jest.fn();
const mockMergeUniqueQueries = jest.fn();
const mockPickSeasonalCategories = jest.fn();
const mockGetAllAudienceAugmentQueries = jest.fn();
const mockEstimateGoogleCallsCostUsd = jest.fn();

jest.mock(
  "@web/src/server/services/community/providers/google/core/search",
  () => ({
    fetchScoredPlacesForQueries: (...args: unknown[]) =>
      mockFetchScoredPlacesForQueries(...args),
    getSearchAnchors: (...args: unknown[]) => mockGetSearchAnchors(...args)
  })
);

jest.mock(
  "@web/src/server/services/community/providers/google/core/places/index",
  () => ({
    formatPlaceList: (...args: unknown[]) => mockFormatPlaceList(...args),
    dedupePlaces: (...args: unknown[]) => mockDedupePlaces(...args),
    hydratePlacesFromItems: (...args: unknown[]) =>
      mockHydratePlacesFromItems(...args)
  })
);

jest.mock(
  "@web/src/server/services/community/providers/google/core/pools",
  () => ({
    getPooledCategoryPlaces: (...args: unknown[]) =>
      mockGetPooledCategoryPlaces(...args)
  })
);

jest.mock(
  "@web/src/server/services/community/providers/google/core/seasonal",
  () => ({
    buildSeasonalQueries: (...args: unknown[]) =>
      mockBuildSeasonalQueries(...args),
    estimateSearchCallsForQueries: (...args: unknown[]) =>
      mockEstimateSearchCallsForQueries(...args),
    mergeUniqueQueries: (...args: unknown[]) => mockMergeUniqueQueries(...args),
    pickSeasonalCategories: (...args: unknown[]) =>
      mockPickSeasonalCategories(...args)
  })
);

jest.mock("@web/src/server/services/community/config", () => ({
  AUDIENCE_AUGMENT_CATEGORIES: ["dining", "education"],
  getAllAudienceAugmentQueries: (...args: unknown[]) =>
    mockGetAllAudienceAugmentQueries(...args),
  getAudienceAugmentLimit: jest.fn(() => 3),
  getCategoryDisplayLimit: jest.fn(() => 2),
  getCategoryFallbackQueries: jest.fn(() => ["fallback query"]),
  getCategoryMinPrimaryResults: jest.fn(() => 1),
  getCategoryTargetQueryCount: jest.fn(() => 2)
}));

jest.mock("@web/src/server/services/community/shared/common", () => ({
  getUtcMonthKey: jest.fn(() => "february")
}));

jest.mock("@web/src/server/services/community/shared/apiCost", () => ({
  estimateGoogleCallsCostUsd: (...args: unknown[]) =>
    mockEstimateGoogleCallsCostUsd(...args)
}));

import { buildAudienceAugmentDelta } from "@web/src/server/services/communityData/providers/google/core/audience";

describe("google audience core", () => {
  const logger = { info: jest.fn(), warn: jest.fn() };

  beforeEach(() => {
    mockFetchScoredPlacesForQueries.mockReset();
    mockGetSearchAnchors.mockReset();
    mockFormatPlaceList.mockReset();
    mockDedupePlaces.mockReset();
    mockHydratePlacesFromItems.mockReset();
    mockGetPooledCategoryPlaces.mockReset();
    mockBuildSeasonalQueries.mockReset();
    mockEstimateSearchCallsForQueries.mockReset();
    mockMergeUniqueQueries.mockReset();
    mockPickSeasonalCategories.mockReset();
    mockGetAllAudienceAugmentQueries.mockReset();
    mockEstimateGoogleCallsCostUsd.mockReset();
    logger.info.mockReset();

    mockGetSearchAnchors.mockReturnValue([{ lat: 1, lng: 2 }]);
    mockPickSeasonalCategories.mockReturnValue(["dining"]);
    mockGetAllAudienceAugmentQueries.mockReturnValue({
      dining: ["query one"],
      education: []
    });
    mockMergeUniqueQueries.mockImplementation((a: string[], b: string[]) => [
      ...a,
      ...b
    ]);
    mockBuildSeasonalQueries.mockImplementation((_, __, queries: string[]) => ({
      queries,
      seasonalQueries: new Set<string>()
    }));
    mockEstimateSearchCallsForQueries.mockReturnValue(1);
    mockEstimateGoogleCallsCostUsd.mockReturnValue(1.5);
    mockDedupePlaces.mockImplementation((v: unknown) => v as never);
    mockFetchScoredPlacesForQueries.mockResolvedValue([
      { name: "Cafe", placeId: "p1" }
    ]);
    mockGetPooledCategoryPlaces.mockImplementation(
      async (
        _cache: unknown,
        _logger: unknown,
        _ctx: unknown,
        fetchFn: () => Promise<unknown>
      ) => {
        await fetchFn();
        return [{ placeId: "p1" }];
      }
    );
    mockHydratePlacesFromItems.mockResolvedValue([{ name: "Cafe" }]);
    mockFormatPlaceList.mockReturnValue("- Cafe");
  });

  it("returns empty delta when audience query map is unavailable", async () => {
    mockGetAllAudienceAugmentQueries.mockReturnValueOnce(null);

    await expect(
      buildAudienceAugmentDelta({
        location: { city: "Austin", state_id: "TX", lat: 1, lng: 2 } as never,
        audienceSegment: "growing_families",
        distanceCache: {} as never,
        serviceAreaCache: null,
        serviceAreas: null,
        zipCode: "78701",
        communityCache: {} as never,
        logger,
        anchorOffsets: [{ lat: 0, lng: 0 }],
        getPlaceDetailsCached: jest.fn(),
        getQueryOverrides: jest.fn()
      })
    ).resolves.toEqual({});
  });

  it("builds audience delta across categories", async () => {
    const result = await buildAudienceAugmentDelta({
      location: { city: "Austin", state_id: "TX", lat: 1, lng: 2 } as never,
      audienceSegment: "growing_families",
      distanceCache: {} as never,
      serviceAreaCache: null,
      serviceAreas: null,
      zipCode: "78701",
      communityCache: {} as never,
      logger,
      anchorOffsets: [{ lat: 0, lng: 0 }],
      getPlaceDetailsCached: jest.fn(),
      getQueryOverrides: jest.fn()
    });

    expect(result).toEqual({ dining: "- Cafe", education: "- Cafe" });
    expect(mockFetchScoredPlacesForQueries).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalled();
  });
});
