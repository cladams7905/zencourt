const mockBuildBaseCategoryFieldValues = jest.fn();
const mockBuildCategoryQueryPlan = jest.fn();
const mockGetBaseDetailCallsForCategories = jest.fn();
const mockGetSearchAnchors = jest.fn();
const mockEstimateSearchCallsForQueries = jest.fn();
const mockPickSeasonalCategories = jest.fn();
const mockBuildGeoRuntimeContext = jest.fn();
const mockResolveLocationOrWarn = jest.fn();
const mockLoadBaseCachePlan = jest.fn();
const mockFetchGroupedPlaces = jest.fn();
const mockBuildAndPersistCategoryListMap = jest.fn();
const mockGetAndPersistNeighborhoodLists = jest.fn();
const mockGetOrBuildSeasonalSections = jest.fn();
const mockSetCachedCommunityData = jest.fn();
const mockGetCachedCommunityData = jest.fn();
const mockLoggerInfo = jest.fn();

jest.mock(
  "@web/src/server/services/communityData/providers/google/core/base",
  () => ({
    buildBaseCategoryFieldValues: (...args: unknown[]) =>
      mockBuildBaseCategoryFieldValues(...args),
    buildCategoryQueryPlan: (...args: unknown[]) =>
      mockBuildCategoryQueryPlan(...args),
    getBaseDetailCallsForCategories: (...args: unknown[]) =>
      mockGetBaseDetailCallsForCategories(...args)
  })
);

jest.mock(
  "@web/src/server/services/communityData/providers/google/core/search",
  () => ({
    getSearchAnchors: (...args: unknown[]) => mockGetSearchAnchors(...args)
  })
);

jest.mock(
  "@web/src/server/services/communityData/providers/google/core/seasonal",
  () => ({
    estimateSearchCallsForQueries: (...args: unknown[]) =>
      mockEstimateSearchCallsForQueries(...args),
    pickSeasonalCategories: (...args: unknown[]) =>
      mockPickSeasonalCategories(...args)
  })
);

jest.mock(
  "@web/src/server/services/communityData/providers/google/pipeline/shared",
  () => ({
    buildGeoRuntimeContext: (...args: unknown[]) =>
      mockBuildGeoRuntimeContext(...args),
    resolveLocationOrWarn: (...args: unknown[]) =>
      mockResolveLocationOrWarn(...args),
    communityCache: {
      getCachedCommunityData: (...args: unknown[]) =>
        mockGetCachedCommunityData(...args),
      setCachedCommunityData: (...args: unknown[]) =>
        mockSetCachedCommunityData(...args)
    },
    logger: { info: (...args: unknown[]) => mockLoggerInfo(...args) }
  })
);

jest.mock(
  "@web/src/server/services/communityData/providers/google/pipeline/workflows/planning",
  () => ({
    loadBaseCachePlan: (...args: unknown[]) => mockLoadBaseCachePlan(...args)
  })
);

jest.mock(
  "@web/src/server/services/communityData/providers/google/pipeline/workflows/fetching",
  () => ({
    fetchGroupedPlaces: (...args: unknown[]) => mockFetchGroupedPlaces(...args)
  })
);

jest.mock(
  "@web/src/server/services/communityData/providers/google/pipeline/workflows/assembly",
  () => ({
    buildAndPersistCategoryListMap: (...args: unknown[]) =>
      mockBuildAndPersistCategoryListMap(...args),
    getAndPersistNeighborhoodLists: (...args: unknown[]) =>
      mockGetAndPersistNeighborhoodLists(...args),
    getOrBuildSeasonalSections: (...args: unknown[]) =>
      mockGetOrBuildSeasonalSections(...args)
  })
);

import { getCommunityDataByZip } from "@web/src/server/services/communityData/providers/google/pipeline/service";

describe("google pipeline service", () => {
  beforeEach(() => {
    mockBuildBaseCategoryFieldValues.mockReset();
    mockBuildCategoryQueryPlan.mockReset();
    mockGetBaseDetailCallsForCategories.mockReset();
    mockGetSearchAnchors.mockReset();
    mockEstimateSearchCallsForQueries.mockReset();
    mockPickSeasonalCategories.mockReset();
    mockBuildGeoRuntimeContext.mockReset();
    mockResolveLocationOrWarn.mockReset();
    mockLoadBaseCachePlan.mockReset();
    mockFetchGroupedPlaces.mockReset();
    mockBuildAndPersistCategoryListMap.mockReset();
    mockGetAndPersistNeighborhoodLists.mockReset();
    mockGetOrBuildSeasonalSections.mockReset();
    mockSetCachedCommunityData.mockReset();
    mockGetCachedCommunityData.mockReset();
    mockLoggerInfo.mockReset();

    mockResolveLocationOrWarn.mockResolvedValue({
      city: "Austin",
      state_id: "TX",
      lat: 1,
      lng: 2
    });
    mockBuildGeoRuntimeContext.mockResolvedValue({
      distanceCache: {},
      serviceAreaCache: null
    });
    mockPickSeasonalCategories.mockReturnValue(["dining"]);
    mockLoadBaseCachePlan.mockResolvedValue({
      cachedCategoryLists: new Map(),
      categoriesToFetch: new Set(["dining"]),
      cachedNeighborhoodLists: new Map(),
      neighborhoodsToFetch: []
    });
    mockBuildCategoryQueryPlan.mockReturnValue([
      { key: "dining", queries: ["q1"], seasonalQueries: new Set(), max: 5 }
    ]);
    mockGetSearchAnchors.mockReturnValue([{ lat: 1, lng: 2 }]);
    mockEstimateSearchCallsForQueries.mockReturnValue(1);
    mockGetBaseDetailCallsForCategories.mockReturnValue(2);
    mockFetchGroupedPlaces.mockResolvedValue({
      grouped: { dining: [] },
      alreadyHydratedCategories: new Set()
    });
    mockBuildAndPersistCategoryListMap.mockResolvedValue(
      new Map([["dining_list", "- D1"]])
    );
    mockGetOrBuildSeasonalSections.mockResolvedValue({ spring: "- S1" });
    mockGetAndPersistNeighborhoodLists.mockResolvedValue({
      neighborhoodsGeneral: "- N1",
      neighborhoodsFamily: "- NF1",
      neighborhoodsSenior: "- NS1"
    });
    mockBuildBaseCategoryFieldValues.mockReturnValue({
      dining_list: "- D1",
      coffee_brunch_list: "- (none found)",
      nature_outdoors_list: "- (none found)",
      entertainment_list: "- (none found)",
      attractions_list: "- (none found)",
      sports_rec_list: "- (none found)",
      arts_culture_list: "- (none found)",
      nightlife_social_list: "- (none found)",
      fitness_wellness_list: "- (none found)",
      shopping_list: "- (none found)",
      education_list: "- (none found)",
      community_events_list: "- (none found)"
    });
  });

  it("returns cached community data when available", async () => {
    mockGetCachedCommunityData.mockResolvedValueOnce({ zip_code: "78701" });

    const result = await getCommunityDataByZip("78701");

    expect(result).toEqual({ zip_code: "78701" });
    expect(mockResolveLocationOrWarn).not.toHaveBeenCalled();
  });

  it("builds and caches community data on cache miss", async () => {
    mockGetCachedCommunityData.mockResolvedValueOnce(null);

    const result = await getCommunityDataByZip("78701", ["Austin,TX"]);

    expect(result).toEqual(
      expect.objectContaining({
        city: "Austin",
        state: "TX",
        zip_code: "78701",
        neighborhoods_list: "- N1"
      })
    );
    expect(mockSetCachedCommunityData).toHaveBeenCalled();
  });

  it("returns null when location cannot be resolved", async () => {
    mockGetCachedCommunityData.mockResolvedValueOnce(null);
    mockResolveLocationOrWarn.mockResolvedValueOnce(null);

    await expect(getCommunityDataByZip("78701")).resolves.toBeNull();
  });
});
